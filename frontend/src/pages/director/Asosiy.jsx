import { useState, useEffect, useMemo, useRef } from 'react';
import {
  FiPackage,
  FiDollarSign,
  FiTrendingUp,
  FiCalendar,
  FiBarChart2,
  FiShoppingBag,
  FiPieChart,
  FiClock,
  FiRefreshCw,
  FiChevronRight,
  FiArrowUp,
  FiEye,
  FiInfo,
  FiEdit,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiAlertTriangle,
  FiPercent,
  FiTarget,
  FiTrendingDown,
  FiEyeOff
} from 'react-icons/fi';
import { productAPI, saleAPI } from '../../services/api';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isToday, isSameMonth, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';


const Asosiy = () => {
  const navigate = useNavigate();
  
  // State'lar
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStockValue: 0,
    totalStockCost: 0,
    totalSalesAmount: 0,
    totalSalesCost: 0,
    totalSalesProfit: 0,
    salesProfitMargin: 0,
    dailySales: 0,
    dailyCost: 0,
    dailyProfit: 0,
    dailyProfitMargin: 0,
    monthlySales: 0,
    monthlyCost: 0,
    monthlyProfit: 0,
    monthlyProfitMargin: 0,
    topDailyProduct: null,
    topMonthlyProduct: null,
    dailyDate: new Date(),
    monthlyDate: new Date(),
    salesCount: 0,
    averageSaleAmount: 0,
    productsWithCost: 0,
    productsWithoutCost: 0,
    estimatedCost: 0,
    estimatedProfit: 0,
    problematicProducts: [],
    totalLoss: 0,
    lossMargin: 0,
  });
  
  const [dailyReport, setDailyReport] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDailyDetails, setShowDailyDetails] = useState(false);
  const [showMonthlyDetails, setShowMonthlyDetails] = useState(false);
  const [showCostInfo, setShowCostInfo] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showFixPricesModal, setShowFixPricesModal] = useState(false);
  const [problematicProducts, setProblematicProducts] = useState([]);
  
  // Qo'shimcha state: qaysi kartalarda to'liq summa ko'rsatilayotgani
  const [showFullAmounts, setShowFullAmounts] = useState({
    totalStockValue: false,
    totalSalesAmount: false,
    totalSalesCost: false,
    totalSalesProfit: false,
    dailySales: false,
    dailyProfit: false,
    monthlySales: false,
    monthlyProfit: false
  });
  
  const dailyReportRef = useRef(null);
  const monthlyReportRef = useRef(null);

  // Format number
  const formatNumber = (num) => {
    if (!num || isNaN(num)) return '0';
    return new Intl.NumberFormat('uz-UZ').format(Math.round(num));
  };

  // Format foiz
  const formatPercent = (num) => {
    if (isNaN(num)) return '0.0%';
    return `${(num || 0).toFixed(1)}%`;
  };

  // Format date
  const formatDate = (date) => {
    return format(date, 'dd.MM.yyyy');
  };

  // Format month
  const formatMonth = (date) => {
    return format(date, 'MMMM yyyy');
  };

  // Format qisqa summa (B, M, K formatida) - truncate bilan
// Format qisqa summa (faqat 1 milliondan katta bo'lsa qisqarsin)
const formatShortNumber = (num) => {
  if (!num || isNaN(num)) return '0';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  // ✅ FAQAT 1 milliondan katta bo'lsa qisqarsin
  if (absNum >= 1000000) {
    const value = absNum / 1000000;
    // 2 kasr raqamiga truncate qilish
    const truncated = Math.floor(value * 100) / 100;
    
    // Agar kasr qismi 0 bo'lsa, uni ko'rsatma
    if (truncated % 1 === 0) {
      return `${sign}${truncated}M`;
    }
    
    // Kasr qismini tekshirish - agar oxirgi raqam 0 bo'lsa, uni olib tashlash
    const formatted = truncated.toFixed(2);
    
    // .00 ni olib tashlash
    if (formatted.endsWith('.00')) {
      return `${sign}${formatted.slice(0, -3)}M`;
    }
    // .0 ni olib tashlash
    if (formatted.endsWith('0')) {
      return `${sign}${formatted.slice(0, -1)}M`;
    }
    
    return `${sign}${formatted}M`;
  }
  
  // ✅ 1 milliondan kichik bo'lsa, to'liq format bilan
  return `${sign}${formatNumber(absNum)}`;
};

// Test cases:
// formatShortNumber(500000) => "500,000"
// formatShortNumber(1500000) => "1.5M"
// formatShortNumber(2000000) => "2M"
// formatShortNumber(2300000) => "2.3M"
// formatShortNumber(2350000) => "2.35M"

  // Test uchun: formatShortNumber(230370000) => "230.37M"
  // formatShortNumber(230370000) hozir "230.37M" qaytaradi

  // Ko'z belgisini bosganda chaqiriladigan funksiya
  const toggleFullAmount = (key) => {
    setShowFullAmounts(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Statistik kartalar uchun ko'rsatiladigan qiymatni tanlash
  const getDisplayAmount = (value, key) => {
    if (showFullAmounts[key]) {
      // ✅ To'liq ko'rinish: 1,000,000 UZS
      return `${formatNumber(value)} UZS`;
    } else {
      // ✅ Qisqa ko'rinish: 1 milliondan katta bo'lsa M, kichik bo'lsa to'liq
      return `${formatShortNumber(value)} UZS`;
    }
  };

  // Mahsulot narxlarini tekshirish
  const checkProductPrices = (products) => {
    const problematic = [];
    let totalPotentialLoss = 0;
    
    products.forEach(product => {
      if (product.cost && product.price && product.cost > product.price) {
        const lossPerUnit = product.cost - product.price;
        const totalLoss = lossPerUnit * (product.quantity || 0);
        
        problematic.push({
          ...product,
          lossPerUnit,
          totalLoss,
          percentageLoss: ((lossPerUnit / product.cost) * 100).toFixed(1)
        });
        
        totalPotentialLoss += totalLoss;
      }
    });
    
    return { problematic, totalPotentialLoss };
  };

  // Xarajat va foyda hisoblash funksiyasi
  const calculateCostAndProfit = (itemAmount, unitCost, quantity, hasRealCost) => {
    const qty = quantity || 1;
    
    if (hasRealCost && unitCost > 0) {
      const totalCost = unitCost * qty;
      const profit = itemAmount - totalCost;
      
      return {
        cost: totalCost,
        profit: profit,
        costType: 'haqiqiy',
        isProfitable: profit >= 0
      };
    } else {
      const standardProfitMargin = 0.4;
      const profit = itemAmount * standardProfitMargin;
      const cost = itemAmount - profit;
      
      return {
        cost: cost,
        profit: profit,
        costType: 'taxminiy',
        isProfitable: true
      };
    }
  };

  // Mahsulotlar sahifasiga o'tish
  const goToProductsPage = () => {
    console.log('Mahsulotlar sahifasiga o\'tish');
    setShowFixPricesModal(true);
  };

  // Narxlarni tuzatish modalini yopish
  const handleFixPrices = (action) => {
    console.log(`${action} amalini bajarish`);
    if (action === 'increasePrice') {
      alert('Sotish narxlari 20% ga oshirildi (simulyatsiya)');
    } else if (action === 'decreaseCost') {
      alert('Xarajat narxlari 15% ga kamaytirildi (simulyatsiya)');
    }
    setShowFixPricesModal(false);
  };

  // Sanalarni hisoblash
  const dateRanges = useMemo(() => {
    const now = new Date();
    return {
      todayStart: startOfDay(now),
      todayEnd: endOfDay(now),
      monthStart: startOfMonth(now),
      monthEnd: endOfMonth(now),
      today: now
    };
  }, []);

  // Sana tekshirish
  const parseSaleDate = (dateString) => {
    try {
      if (!dateString) return new Date();
      
      if (dateString.includes('T')) {
        return parseISO(dateString);
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date();
      }
      return date;
    } catch (err) {
      console.warn('Sana pars qilishda xatolik:', err);
      return new Date();
    }
  };

  // Ma'lumotlarni yuklash
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowWarning(false);

      const { todayStart, todayEnd, monthStart, monthEnd } = dateRanges;

      // 1. Mahsulotlarni olish
      const productsRes = await productAPI.getAll();
      const products = productsRes.data.data || [];
      
      // Mahsulot narxlarini tekshirish
      const { problematic, totalPotentialLoss } = checkProductPrices(products);
      setProblematicProducts(problematic);
      
      if (problematic.length > 0) {
        setShowWarning(true);
      }

      // 2. Sotuvlarni olish
      const salesRes = await saleAPI.getAll();
      const sales = salesRes.data.data || [];

      // 3. Mahsulotlar ma'lumotlari
      const productCosts = {};
      let productsWithCost = 0;
      let productsWithoutCost = 0;
      
      products.forEach(product => {
        if (product._id) {
          const hasRealCost = !!product.cost && product.cost > 0;
          
          productCosts[product._id] = {
            cost: product.cost || 0,
            price: product.price || 0,
            hasCost: hasRealCost,
            name: product.name || 'Noma\'lum',
            isProblematic: product.cost > product.price
          };
          
          if (hasRealCost) {
            productsWithCost++;
          } else {
            productsWithoutCost++;
          }
        }
      });

      // 4. Ombordagi statistikalar
      const totalProducts = products.length;
      const totalStockValue = products.reduce((sum, product) => 
        sum + ((product.price || 0) * (product.quantity || 0)), 0
      );
      const totalStockCost = products.reduce((sum, product) => 
        sum + ((product.cost || 0) * (product.quantity || 0)), 0
      );

      // 5. Sotuvlar statistikasi
      let totalSalesAmount = 0;
      let totalSalesCost = 0;
      let totalSalesProfit = 0;
      let dailySales = 0;
      let dailyCost = 0;
      let dailyProfit = 0;
      let monthlySales = 0;
      let monthlyCost = 0;
      let monthlyProfit = 0;
      let salesCount = 0;
      let estimatedCost = 0;
      let estimatedProfit = 0;
      let totalLossAmount = 0;
      
      const todayProductSales = {};
      const monthProductSales = {};

      // Sotuvlarni qayta ishlash
      sales.forEach(sale => {
        const saleDate = parseSaleDate(sale.date || sale.createdAt);
        const isTodaySale = saleDate >= todayStart && saleDate <= todayEnd;
        const isThisMonthSale = saleDate >= monthStart && saleDate <= monthEnd;
        
        (sale.items || []).forEach(item => {
          const productId = item.product?._id || item.product;
          const unitCost = productCosts[productId]?.cost || 0;
          const hasRealCost = productCosts[productId]?.hasCost || false;
          const productName = productCosts[productId]?.name || item.productName || item.name || 'Noma\'lum';
          const isProblematic = productCosts[productId]?.isProblematic || false;
          
          // Item summasini hisoblash
          let itemAmount = 0;
          const itemQuantity = item.quantity || 1;
          
          if (item.total && item.total > 0) {
            itemAmount = item.total;
          } else {
            const itemPrice = item.price || item.product?.price || productCosts[productId]?.price || 0;
            itemAmount = itemPrice * itemQuantity;
          }

          // Xarajat va foyda hisoblash
          const { cost: itemCost, profit: itemProfit, costType, isProfitable } = calculateCostAndProfit(
            itemAmount, 
            unitCost, 
            itemQuantity, 
            hasRealCost
          );
          
          // Zarar miqdorini hisoblash
          if (!isProfitable) {
            totalLossAmount += Math.abs(itemProfit);
          }
          
          // Umumiy statistikalar
          totalSalesAmount += itemAmount;
          totalSalesCost += itemCost;
          totalSalesProfit += itemProfit;
          salesCount++;
          
          if (!hasRealCost) {
            estimatedCost += itemCost;
            estimatedProfit += itemProfit;
          }
          
          // Kunlik statistikalar
          if (isTodaySale) {
            dailySales += itemAmount;
            dailyCost += itemCost;
            dailyProfit += itemProfit;
            
            if (!todayProductSales[productId]) {
              todayProductSales[productId] = {
                name: productName,
                quantity: 0,
                amount: 0,
                cost: 0,
                profit: 0,
                hasCost: hasRealCost,
                isProblematic,
                costType
              };
            }
            todayProductSales[productId].quantity += itemQuantity;
            todayProductSales[productId].amount += itemAmount;
            todayProductSales[productId].cost += itemCost;
            todayProductSales[productId].profit += itemProfit;
          }
          
          // Oylik statistikalar
          if (isThisMonthSale) {
            monthlySales += itemAmount;
            monthlyCost += itemCost;
            monthlyProfit += itemProfit;
            
            if (!monthProductSales[productId]) {
              monthProductSales[productId] = {
                name: productName,
                quantity: 0,
                amount: 0,
                cost: 0,
                profit: 0,
                hasCost: hasRealCost,
                isProblematic,
                costType
              };
            }
            monthProductSales[productId].quantity += itemQuantity;
            monthProductSales[productId].amount += itemAmount;
            monthProductSales[productId].cost += itemCost;
            monthProductSales[productId].profit += itemProfit;
          }
        });
      });

      // Foyda foizlarini hisoblash
      const salesProfitMargin = totalSalesAmount > 0 ? (totalSalesProfit / totalSalesAmount) * 100 : 0;
      const dailyProfitMargin = dailySales > 0 ? (dailyProfit / dailySales) * 100 : 0;
      const monthlyProfitMargin = monthlySales > 0 ? (monthlyProfit / monthlySales) * 100 : 0;
      
      // O'rtacha chek
      const averageSaleAmount = salesCount > 0 ? totalSalesAmount / salesCount : 0;

      // Top mahsulotlar
      const topDaily = Object.values(todayProductSales)
        .sort((a, b) => b.amount - b.amount)[0] || null;
      
      const topMonthly = Object.values(monthProductSales)
        .sort((a, b) => b.amount - b.amount)[0] || null;

      // Hisobotlarni tayyorlash
      const dailyReportData = Object.values(todayProductSales)
        .map(item => ({
          ...item,
          profitText: formatNumber(item.profit) + ' UZS',
          profitMargin: item.amount > 0 ? (item.profit / item.amount) * 100 : 0
        }))
        .sort((a, b) => b.amount - b.amount);
      
      const monthlyReportData = Object.values(monthProductSales)
        .map(item => ({
          ...item,
          profitText: formatNumber(item.profit) + ' UZS',
          profitMargin: item.amount > 0 ? (item.profit / item.amount) * 100 : 0
        }))
        .sort((a, b) => b.amount - b.amount);

      // Stats ga saqlash
      setStats({
        totalProducts,
        totalStockValue,
        totalStockCost,
        totalSalesAmount,
        totalSalesCost,
        totalSalesProfit,
        salesProfitMargin,
        dailySales,
        dailyCost,
        dailyProfit,
        dailyProfitMargin,
        monthlySales,
        monthlyCost,
        monthlyProfit,
        monthlyProfitMargin,
        topDailyProduct: topDaily,
        topMonthlyProduct: topMonthly,
        dailyDate: todayStart,
        monthlyDate: monthStart,
        salesCount,
        averageSaleAmount,
        productsWithCost,
        productsWithoutCost,
        estimatedCost,
        estimatedProfit,
        problematicProducts: problematic,
        totalLoss: totalLossAmount,
        lossMargin: totalSalesAmount > 0 ? (totalLossAmount / totalSalesAmount) * 100 : 0
      });
      
      setDailyReport(dailyReportData);
      setMonthlyReport(monthlyReportData);

      // Xarajat kiritilmagan mahsulotlar bo'lsa, info ko'rsatish
      if (productsWithoutCost > 0) {
        setShowCostInfo(true);
      }

    } catch (err) {
      console.error('Ma\'lumotlarni yuklashda xatolik:', err);
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // Yangilashni boshqarish
  const checkForDateChange = () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    
    if (!isToday(stats.dailyDate) || !isSameMonth(stats.monthlyDate, monthStart)) {
      loadData();
    }
  };

  // Effect
  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      checkForDateChange();
    }, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkForUpdates = () => {
      loadData();
    };

    const updateInterval = setInterval(checkForUpdates, 10000);
    
    return () => clearInterval(updateInterval);
  }, []);

  // Scroll to top functions
  const scrollToDailyTop = () => {
    if (dailyReportRef.current) {
      dailyReportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToMonthlyTop = () => {
    if (monthlyReportRef.current) {
      monthlyReportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="px-3 sm:px-4 pt-4 sm:pt-6 pb-3 sm:pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-sm sm:text-base">
              {formatDate(new Date())} {format(new Date(), 'HH:mm')}
            </p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 sm:p-2.5 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Yangilash"
            >
              <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Ogohlantirish: Xarajat sotish narxidan katta */}
      {showWarning && !loading && (
        <div className="mx-3 sm:mx-4 mb-3 sm:mb-4 p-3 sm:p-4 bg-linear-to-r from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-800/40 rounded-lg mt-0.5">
              <FiAlertTriangle className="text-red-600 dark:text-red-400" size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-0.5 text-sm sm:text-base">
                  ⚠️ ZARAR KELTIRUVCHI MAHSULOTLAR!
                </h4>
                <button
                  onClick={() => setShowWarning(false)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <FiX size={14} />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-400 mb-2">
                <span className="font-bold">{problematicProducts.length} ta mahsulot</span> xarajati sotish narxidan yuqori!
                Har bir sotuvda zarar kelishi mumkin.
              </p>
              
              {problematicProducts.slice(0, 3).map((product, idx) => (
                <div key={idx} className="mb-2 p-2 bg-red-100/50 dark:bg-red-900/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-red-800 dark:text-red-300 text-sm">
                      {product.name}
                    </span>
                    <span className="text-xs bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                      {product.percentageLoss}% zarar
                    </span>
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Xarajat: {formatNumber(product.cost)} &lt; Sotish: {formatNumber(product.price)}
                    <div className="mt-0.5">
                      Har donada: <span className="font-bold">{formatNumber(product.lossPerUnit)} UZS</span> zarar
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Xarajat ma'lumoti */}
      {showCostInfo && !loading && (
        <div className="mx-3 sm:mx-4 mb-3 sm:mb-4 p-3 sm:p-4 bg-linear-to-r from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-yellow-100 dark:bg-yellow-800/40 rounded-lg mt=0.5">
              <FiInfo className="text-yellow-600 dark:text-yellow-400" size={16} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-0.5 text-sm sm:text-base">
                  Eslatma: Xarajatlar ma'lumoti
                </h4>
                <button
                  onClick={() => setShowCostInfo(false)}
                  className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                >
                  <FiX size={14} />
                </button>
              </div>
              <button
                onClick={goToProductsPage}
                className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300"
              >
                <FiEdit size={12} />
                Mahsulotlarga asl narx kiritish →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xato xabari */}
      {error && (
        <div className="mx-3 sm:mx-4 mb-3 sm:mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-3 sm:px-4 py-2 sm:py-3 rounded-xl">
          <div className="flex items-center gap-1 sm:gap-2">
            <FiRefreshCw size={16} />
            <span className="text-sm">{error}</span>
            <button 
              onClick={loadData}
              className="ml-auto text-xs sm:text-sm font-medium hover:underline"
            >
              Qayta urinish
            </button>
          </div>
        </div>
      )}

      {/* Kunlik va oylik hisobotlar */}
      <div className="px-3 sm:px-4 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Kunlik hisobot */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FiClock className="text-blue-600 dark:text-blue-400" size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Kunlik Hisobot
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Bugun: {formatDate(dateRanges.today)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDailyDetails(!showDailyDetails)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {showDailyDetails ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                  {loading ? '...' : getDisplayAmount(stats.dailySales, 'dailySales')}
                </div>
                <button
                  onClick={() => toggleFullAmount('dailySales')}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={showFullAmounts.dailySales ? "Qisqa ko'rinish" : "To'liq ko'rinish"}
                >
                  {showFullAmounts.dailySales ? (
                    <FiEyeOff className="text-gray-500 dark:text-gray-400" size={16} />
                  ) : (
                    <FiEye className="text-gray-500 dark:text-gray-400" size={16} />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {dailyReport.length} ta mahsulot
                </div>
                <div className={`text-sm font-medium ${stats.dailyProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stats.dailyProfit >= 0 ? '+' : ''}{formatNumber(stats.dailyProfit)} UZS
                  {stats.dailySales > 0 && (
                    <span className="ml-1 text-xs">
                      ({formatPercent(stats.dailyProfitMargin)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {showDailyDetails && dailyReport.length > 0 && (
              <div 
                ref={dailyReportRef}
                className="mt-4 border-t pt-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
              >
                <div className="space-y-3">
                  {dailyReport.map((item, index) => {
                    const profitPercent = item.profitMargin;
                    const isProfitPositive = item.profit >= 0;
                    
                    return (
                      <div 
                        key={index} 
                        className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 flex items-center justify-center bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">
                              {item.name}
                            </div>
                            {item.isProblematic && (
                              <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                                ⚠️ zarar
                              </span>
                            )}
                            {!item.hasCost && (
                              <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">
                                taxminiy
                              </span>
                            )}
                          </div>
                          <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                            {formatNumber(item.quantity)} dona
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">Sotish:</div>
                            <div className="font-semibold text-green-600 dark:text-green-400">
                              {formatNumber(item.amount)} UZS
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">
                              {item.profit >= 0 ? 'Foyda:' : 'Zarar:'}
                            </div>
                            <div className={`font-semibold ${isProfitPositive ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                              {isProfitPositive ? '+' : ''}{formatNumber(item.profit)} UZS
                              <span className="text-xs ml-1">({formatPercent(profitPercent)})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {dailyReport.length > 3 && (
                  <button
                    onClick={scrollToDailyTop}
                    className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <FiChevronUp size={14} />
                    Yuqoriga qaytish
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Oylik hisobot */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <FiCalendar className="text-purple-600 dark:text-purple-400" size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Oylik Hisobot
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {formatMonth(dateRanges.today)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMonthlyDetails(!showMonthlyDetails)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {showMonthlyDetails ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                  {loading ? '...' : getDisplayAmount(stats.monthlySales, 'monthlySales')}
                </div>
                <button
                  onClick={() => toggleFullAmount('monthlySales')}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={showFullAmounts.monthlySales ? "Qisqa ko'rinish" : "To'liq ko'rinish"}
                >
                  {showFullAmounts.monthlySales ? (
                    <FiEyeOff className="text-gray-500 dark:text-gray-400" size={16} />
                  ) : (
                    <FiEye className="text-gray-500 dark:text-gray-400" size={16} />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {monthlyReport.length} ta mahsulot
                </div>
                <div className={`text-sm font-medium ${stats.monthlyProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stats.monthlyProfit >= 0 ? '+' : ''}{formatNumber(stats.monthlyProfit)} UZS
                  {stats.monthlySales > 0 && (
                    <span className="ml-1 text-xs">
                      ({formatPercent(stats.monthlyProfitMargin)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {showMonthlyDetails && monthlyReport.length > 0 && (
              <div 
                ref={monthlyReportRef}
                className="mt-4 border-t pt-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
              >
                <div className="space-y-3">
                  {monthlyReport.slice(0, 5).map((item, index) => {
                    const profitPercent = item.profitMargin;
                    const isProfitPositive = item.profit >= 0;
                    
                    return (
                      <div 
                        key={index} 
                        className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 flex items-center justify-center bg-linear-to-r from-purple-500 to-purple-600 text-white rounded-lg font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">
                              {item.name}
                            </div>
                            {item.isProblematic && (
                              <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                                ⚠️ zarar
                              </span>
                            )}
                            {!item.hasCost && (
                              <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">
                                taxminiy
                              </span>
                            )}
                          </div>
                          <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                            {formatNumber(item.quantity)} dona
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">Sotish:</div>
                            <div className="font-semibold text-green-600 dark:text-green-400">
                              {formatNumber(item.amount)} UZS
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">
                              {item.profit >= 0 ? 'Foyda:' : 'Zarar:'}
                            </div>
                            <div className={`font-semibold ${isProfitPositive ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                              {isProfitPositive ? '+' : ''}{formatNumber(item.profit)} UZS
                              <span className="text-xs ml-1">({formatPercent(profitPercent)})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {monthlyReport.length > 5 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      + {monthlyReport.length - 5} ta mahsulot
                    </p>
                    <button
                      onClick={scrollToMonthlyTop}
                      className="mt-2 w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FiChevronUp size={14} />
                      Yuqoriga qaytish
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asosiy statistikalar */}
      <div className="px-3 sm:px-4 pb-4 sm:pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* 1. Ombordagi mahsulotlar */}
          <div className={`rounded-2xl p-4 text-white shadow-xl ${
            stats.totalStockValue > stats.totalStockCost 
              ? 'bg-linear-to-br from-blue-500 to-blue-600' 
              : 'bg-linear-to-br from-red-500 to-red-600'
          } relative`}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FiPackage size={20} />
              </div>
              <span className="text-sm opacity-90">Ombor qiymati</span>
              <button
                onClick={() => toggleFullAmount('totalStockValue')}
                className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-lg transition-colors z-10"
                title={showFullAmounts.totalStockValue ? "Qisqa ko'rinish" : "To'liq ko'rinish"}
              >
                {showFullAmounts.totalStockValue ? (
                  <FiEyeOff className="text-white/90" size={14} />
                ) : (
                  <FiEye className="text-white/90" size={14} />
                )}
              </button>
            </div>
            <div className="text-xl font-bold mb-1">
              {loading ? '...' : getDisplayAmount(stats.totalStockValue, 'totalStockValue')}
            </div>
            <div className="text-xs opacity-80 mb-3">{stats.totalProducts} ta mahsulot</div>
            <div className="text-xs opacity-90">
              <div>Xarajat: {formatShortNumber(stats.totalStockCost)} UZS</div>
              <div className={`mt-1 ${stats.totalStockValue > stats.totalStockCost ? 'text-green-300' : 'text-red-300'}`}>
                {stats.totalStockValue > stats.totalStockCost ? 'Foyda:' : 'Zarar:'} {formatShortNumber(stats.totalStockValue - stats.totalStockCost)} UZS
              </div>
            </div>
          </div>

          {/* 2. Jami sotish */}
          <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-xl relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FiDollarSign size={20} />
              </div>
              <span className="text-sm opacity-90">Jami Sotish</span>
              <button
                onClick={() => toggleFullAmount('totalSalesAmount')}
                className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-lg transition-colors z-10"
                title={showFullAmounts.totalSalesAmount ? "Qisqa ko'rinish" : "To'liq ko'rinish"}
              >
                {showFullAmounts.totalSalesAmount ? (
                  <FiEyeOff className="text-white/90" size={14} />
                ) : (
                  <FiEye className="text-white/90" size={14} />
                )}
              </button>
            </div>
            <div className="text-xl font-bold mb-1">
              {loading ? '...' : getDisplayAmount(stats.totalSalesAmount, 'totalSalesAmount')}
            </div>
            <div className="text-xs opacity-80 mb-3">{stats.salesCount} ta sotuv</div>
            <div className="text-xs opacity-90 flex items-center justify-between">
              <span>Kunlik: {formatShortNumber(stats.dailySales)} UZS</span>
              {stats.dailySales > 0 && <FiArrowUp size={12} />}
            </div>
          </div>

          {/* 3. Jami xarajat */}
          <div className={`rounded-2xl p-4 text-white shadow-xl ${
            stats.totalSalesCost <= stats.totalSalesAmount
              ? 'bg-linear-to-br from-orange-500 to-orange-600'
              : 'bg-linear-to-br from-red-500 to-red-600'
          } relative`}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <FiBarChart2 size={20} />
              </div>
              <span className="text-sm opacity-90">Jami Xarajat</span>
              <button
                onClick={() => toggleFullAmount('totalSalesCost')}
                className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-lg transition-colors z-10"
                title={showFullAmounts.totalSalesCost ? "Qisqa ko'rinish" : "To'liq ko'rinish"}
              >
                {showFullAmounts.totalSalesCost ? (
                  <FiEyeOff className="text-white/90" size={14} />
                ) : (
                  <FiEye className="text-white/90" size={14} />
                )}
              </button>
            </div>
            <div className="text-xl font-bold mb-1">
              {loading ? '...' : getDisplayAmount(stats.totalSalesCost, 'totalSalesCost')}
            </div>
            <div className="text-xs opacity-80 mb-3">
              {stats.productsWithoutCost > 0 ? 'Haqiqiy + taxminiy' : 'Sotishlar uchun'}
            </div>
            <div className="text-xs opacity-90 flex items-center">
              <FiInfo size={12} className="mr-1" />
              <span>{stats.productsWithCost} ta haqiqiy narx</span>
            </div>
          </div>

          {/* 4. Jami foyda/zarar */}
          <div className={`rounded-2xl p-4 text-white shadow-xl ${
            stats.totalSalesProfit > 0 
              ? 'bg-linear-to-br from-purple-500 to-purple-600'
              : stats.totalSalesProfit < 0
              ? 'bg-linear-to-br from-red-500 to-red-600'
              : 'bg-linear-to-br from-gray-500 to-gray-600'
          } relative`}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/20 rounded-xl">
                {stats.totalSalesProfit >= 0 ? <FiTrendingUp size={20} /> : <FiTrendingDown size={20} />}
              </div>
              <span className="text-sm opacity-90">
                {stats.totalSalesProfit >= 0 ? 'Jami Foyda' : 'Jami Zarar'}
              </span>
              <button
                onClick={() => toggleFullAmount('totalSalesProfit')}
                className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-lg transition-colors z-10"
                title={showFullAmounts.totalSalesProfit ? "Qisqa ko'rinish" : "To'liq ko'rinish"}
              >
                {showFullAmounts.totalSalesProfit ? (
                  <FiEyeOff className="text-white/90" size={14} />
                ) : (
                  <FiEye className="text-white/90" size={14} />
                )}
              </button>
            </div>
            <div className="text-xl font-bold mb-1">
              {loading ? '...' : getDisplayAmount(Math.abs(stats.totalSalesProfit), 'totalSalesProfit')}
            </div>
            <div className="text-xs opacity-80 mb-3">
              {stats.totalSalesProfit > 0 ? `${formatPercent(stats.salesProfitMargin)} foyda` : 
               stats.totalSalesProfit < 0 ? `${formatPercent(Math.abs(stats.salesProfitMargin))} zarar` :
               stats.productsWithoutCost > 0 ? 'Taxminiy hisob' : 'Hisoblanmadi'}
            </div>
            <div className="text-xs opacity-90 flex items-center justify-between">
              <span>Sotish - Xarajat</span>
              <FiShoppingBag size={12} />
            </div>
          </div>
        </div>

        {/* Zarar tahlili */}
        {stats.totalSalesProfit < 0 && (
          <div className="mb-6">
            <div className="bg-linear-to-r from-red-500 to-orange-600 rounded-2xl p-4 sm:p-5 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <FiAlertTriangle size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    ⚠️ ZARAR TAHLILI
                  </h3>
                  <p className="text-white/90 text-sm">
                    Nima uchun zarar kelayapti va qanday tuzatish kerak
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <div className="text-xs text-white/80 mb-1">Muammo sababi</div>
                  <div className="text-base font-bold text-white">
                    {problematicProducts.length > 0 
                      ? `${problematicProducts.length} ta mahsulot` 
                      : 'Xarajatlar yuqori'}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    Xarajat &lt; Sotish narxi
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <div className="text-xs text-white/80 mb-1">Umumiy zarar</div>
                  <div className="text-base font-bold text-white">
                    {formatNumber(Math.abs(stats.totalSalesProfit))} UZS
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {formatPercent(Math.abs(stats.salesProfitMargin))} sotishdan
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <div className="text-xs text-white/80 mb-1">Yechim</div>
                  <div className="text-base font-bold text-white">
                    Narxlarni tuzatish
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    1) Sotish narxini oshirish<br/>
                    2) Xarajatni kamaytirish
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleFixPrices('increasePrice')}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Sotish narxini oshirish (20%)
                </button>
                <button
                  onClick={() => handleFixPrices('decreaseCost')}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Xarajatni kamaytirish (15%)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Foyda statistikasi */}
        <div className="mt-6">
          <div className={`rounded-2xl p-4 sm:p-5 shadow-2xl ${
            stats.totalSalesProfit > 0 
              ? 'bg-linear-to-r from-emerald-500 to-green-600' 
              : stats.totalSalesProfit < 0
              ? 'bg-linear-to-r from-red-500 to-orange-600'
              : stats.productsWithoutCost > 0
              ? 'bg-linear-to-r from-yellow-500 to-amber-600'
              : 'bg-linear-to-r from-blue-500 to-blue-600'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl">
                  <FiPieChart size={24} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {stats.totalSalesProfit > 0 ? '📈 Sotish Foydasi' : 
                     stats.totalSalesProfit < 0 ? '⚠️ Sotish Zarari' :
                     stats.productsWithoutCost > 0 ? '📊 Taxminiy Hisobot' : '📊 Sotish Statistikasi'}
                  </h3>
                  <p className="text-white/90 text-sm">
                    {formatDate(dateRanges.today)} | {formatMonth(dateRanges.today)}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {loading ? '...' : getDisplayAmount(stats.totalSalesAmount, 'totalSalesAmount')}
                </div>
                <div className="flex items-center justify-end gap-2 text-white/90 text-sm">
                  <FiDollarSign size={14} />
                  <span>Umumiy sotish</span>
                </div>
              </div>
            </div>
            
            {/* Statistik tafsilotlari */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="text-xs text-white/80 mb-1">Jami xarajat</div>
                <div className="text-lg font-bold text-white">
                  {loading ? '...' : getDisplayAmount(stats.totalSalesCost, 'totalSalesCost')}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {stats.productsWithoutCost > 0 ? 'Haqiqiy + taxminiy' : 'Mahsulotlar asl narxi'}
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="text-xs text-white/80 mb-1">
                  {stats.totalSalesProfit >= 0 ? 'Jami foyda' : 'Jami zarar'}
                </div>
                <div className={`text-lg font-bold ${
                  stats.totalSalesProfit > 0 ? 'text-white' : 
                  stats.totalSalesProfit < 0 ? 'text-red-200' : 'text-white/80'
                }`}>
                  {loading ? '...' : getDisplayAmount(Math.abs(stats.totalSalesProfit), 'totalSalesProfit')}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {stats.salesProfitMargin !== 0 ? formatPercent(Math.abs(stats.salesProfitMargin)) : 
                   stats.productsWithoutCost > 0 ? 'Taxminiy hisob' : 'Hisoblanmadi'}
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="text-xs text-white/80 mb-1">O'rtacha chek</div>
                <div className="text-lg font-bold text-white">
                  {loading ? '...' : formatShortNumber(stats.averageSaleAmount)} UZS
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {stats.salesCount} ta sotuv
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="text-xs text-white/80 mb-1">Hisob turi</div>
                <div className={`text-lg font-bold ${
                  stats.totalSalesProfit > 0 && stats.productsWithoutCost === 0 ? 'text-white' : 
                  stats.totalSalesProfit < 0 ? 'text-red-200' :
                  stats.productsWithoutCost > 0 ? 'text-yellow-300' : 'text-white/80'
                }`}>
                  {stats.productsWithoutCost === 0 && stats.totalSalesProfit > 0 ? '✅ Aniq hisob' : 
                   stats.totalSalesProfit < 0 ? '⚠️ Zarar' :
                   stats.productsWithoutCost > 0 ? '📊 Taxminiy' : '📋 Ma\'lumot yo\'q'}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {stats.productsWithoutCost > 0 ? `${stats.productsWithoutCost} ta narx yo'q` : 
                   `${stats.productsWithCost} ta mahsulot`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Narxlarni tuzatish modali */}
      {showFixPricesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Narxlarni tuzatish
              </h3>
              <button
                onClick={() => setShowFixPricesModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {problematicProducts.length} ta mahsulotda xarajat sotish narxidan yuqori.
              Quyidagi variantlardan birini tanlang:
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleFixPrices('increasePrice')}
                className="w-full p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-left"
              >
                <div className="font-semibold">Sotish narxini 20% oshirish</div>
                <div className="text-sm mt-1">
                  Barcha mahsulotlarning sotish narxini 20% ga oshiradi
                </div>
              </button>
              
              <button
                onClick={() => handleFixPrices('decreaseCost')}
                className="w-full p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-left"
              >
                <div className="font-semibold">Xarajatni 15% kamaytirish</div>
                <div className="text-sm mt-1">
                  Xarajati yuqori bo'lgan mahsulotlarning xarajatini 15% ga kamaytiradi
                </div>
              </button>
              
              <button
                onClick={goToProductsPage}
                className="w-full p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-left"
              >
                <div className="font-semibold">Qo'lda tahrirlash</div>
                <div className="text-sm mt-1">
                  Har bir mahsulotni alohida tahrirlash
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tailwind CSS scrollbar uchun */}
      <style jsx="true">{`
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .dark .scrollbar-thin::-webkit-scrollbar-track {
          background: #374151;
        }
        .dark .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default Asosiy;