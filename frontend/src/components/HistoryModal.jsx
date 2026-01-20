import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FiX, FiPackage, FiDollarSign, FiCalendar, 
  FiClock, FiCheckCircle, FiTrash2, FiAlertCircle,
  FiShoppingBag, FiCreditCard, FiArrowLeft, FiRefreshCw,
  FiFileText, FiCreditCard as FiCard, FiEdit,
  FiUser, FiPercent, FiMinusCircle, FiPlusCircle,
  FiCreditCard as FiCreditCardIcon
} from 'react-icons/fi';
import { debtorAPI, saleAPI } from '../services/api';

const HistoryModal = ({ isOpen, onClose, debtor, onRefreshDebtors }) => {
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [debtHistory, setDebtHistory] = useState({
    products: [],
    payments: [],
    removed: []
  });
  
  const [showPayModal, setShowPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash',
    notes: ''
  });

  const showToast = (message, type = 'success') => {
    if (type === 'success') {
      alert(`✅ ${message}`);
    } else {
      alert(`❌ ${message}`);
    }
  };

  const loadDebtHistory = useCallback(async () => {
    if (!debtor?._id) return;
    
    setLoading(true);
    try {
      // 1. Sotuvlarni olish
      let sales = [];
      try {
        const salesRes = await saleAPI.getByDebtor(debtor._id);
        sales = salesRes.data?.data?.sales || salesRes.data?.sales || salesRes.data || [];
      } catch (salesError) {
        console.log('Sales endpoint error:', salesError.message);
      }

      const allProducts = [];
      const allPayments = [];
      const removedItems = [];
      
      // Savdolarni qayta ishlash
      sales.forEach(sale => {
        // ✅ Nasiya mahsulotlarni ajratish
        if (sale.paymentMethod === 'credit' && sale.items?.length > 0) {
          sale.items.forEach(item => {
            allProducts.push({
              id: `${sale._id}-${item.product || Math.random()}`,
              saleId: sale._id,
              productId: item.product?._id || item.product,
              name: item.productName || item.product?.name || 'Noma\'lum mahsulot',
              barcode: item.barcode || item.product?.barcode || 'N/A',
              quantity: item.quantity || 1,
              price: item.price || 0,
              totalPrice: item.total || (item.price || 0) * (item.quantity || 1),
              date: sale.createdAt || sale.date,
              paymentMethod: sale.paymentMethod,
              isCredit: true,
              isPaid: false,
              isRemoved: false,
              notes: sale.notes || '',
              createdAt: sale.createdAt
            });
          });
        }
        
        // Naqd to'lovlar uchun
        if (sale.paymentMethod === 'cash') {
          allPayments.push({
            id: sale._id,
            type: 'sale_cash',
            amount: sale.totalAmount || 0,
            method: 'cash',
            date: sale.createdAt || sale.date,
            notes: sale.notes || `Naqd savdo: ${sale.items?.length || 0} ta mahsulot`,
            referenceId: sale._id
          });
        }
      });
      
      // Tartiblash
      const sortedProducts = allProducts.sort((a, b) => 
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
      );
      
      const sortedPayments = allPayments.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      setDebtHistory({
        products: sortedProducts,
        payments: sortedPayments,
        removed: []
      });
      
    } catch (error) {
      console.error('Tarix yuklashda xatolik:', error);
      showToast(`Tarixni yuklashda xatolik: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [debtor]);

  useEffect(() => {
    if (isOpen && debtor) {
      loadDebtHistory();
    }
  }, [isOpen, debtor, loadDebtHistory]);

  // Mahsulotni o'chirish funksiyasi
  const handleRemoveProduct = async (product) => {
    const reason = prompt('O\'chirish sababini kiriting:', 'Mahsulot qaytarildi');
    
    if (!reason) return;
    
    if (!window.confirm(`${product.name} mahsulotini qarzdan o'chirmoqchimisiz?`)) {
      return;
    }
    
    setActionLoading(true);
    try {
      // Qarzdor qarzini kamaytirish
      console.log('O\'chirish boshlanmoqda:', {
        debtorId: debtor._id,
        amount: product.totalPrice,
        productName: product.name,
        reason: reason
      });
      
      const response = await debtorAPI.updateDebt(debtor._id, {
        amount: product.totalPrice || product.price || 0,
        type: 'subtract',
        notes: `${product.name} o'chirildi: ${reason}`
      });
      
      console.log('O\'chirish muvaffaqiyatli:', response.data);
      
      // Frontendda yangilash
      setDebtHistory(prev => {
        const updatedProducts = prev.products.map(p => 
          p.id === product.id ? { ...p, isRemoved: true, removedReason: reason, removedDate: new Date().toISOString() } : p
        );
        
        const newRemovedItem = {
          id: `${product.id}-removed-${Date.now()}`,
          name: product.name,
          amount: product.totalPrice,
          reason: `${product.name} o'chirildi: ${reason}`,
          date: new Date().toISOString(),
          type: 'refund'
        };
        
        return {
          ...prev,
          products: updatedProducts,
          removed: [newRemovedItem, ...prev.removed]
        };
      });
      
      if (onRefreshDebtors) {
        onRefreshDebtors();
      }
      
      showToast('Mahsulot qarzdan o\'chirildi', 'success');
      
    } catch (error) {
      console.error('Mahsulot o\'chirishda xatolik:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      showToast(`O'chirish amalga oshirilmadi: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayDebt = async () => {
    if (!debtor?._id || !paymentData.amount || isNaN(paymentData.amount) || paymentData.amount <= 0) {
      showToast('Iltimos, to\'g\'ri miqdor kiriting', 'error');
      return;
    }
    
    setActionLoading(true);
    try {
      const amount = parseFloat(paymentData.amount);
      
      console.log('Qarz to\'lovi boshlanmoqda:', {
        debtorId: debtor._id,
        amount: amount,
        method: paymentData.method,
        notes: paymentData.notes
      });
      
      const response = await debtorAPI.updateDebt(debtor._id, {
        amount: amount,
        type: 'subtract',
        notes: paymentData.notes || `Qarz to'lovi: ${paymentData.method}`
      });
      
      console.log('To\'lov muvaffaqiyatli:', response.data);
      
      await loadDebtHistory();
      if (onRefreshDebtors) {
        onRefreshDebtors();
      }
      
      setShowPayModal(false);
      setPaymentData({ amount: '', method: 'cash', notes: '' });
      
      showToast(`${amount.toLocaleString('uz-UZ')} so'm miqdori muvaffaqiyatli to'landi`, 'success');
      
    } catch (error) {
      console.error('To\'lovda xatolik:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      showToast(`To'lov amalga oshirilmadi: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProductPayment = async (product) => {
    const amount = product.totalPrice || product.price || 0;
    
    if (!window.confirm(`${product.name} uchun ${formatCurrency(amount)} miqdorini to'lashni tasdiqlaysizmi?`)) {
      return;
    }
    
    setActionLoading(true);
    try {
      console.log('Mahsulot to\'lovi boshlanmoqda:', { 
        debtorId: debtor._id, 
        amount: amount, 
        productName: product.name 
      });
      
      const response = await debtorAPI.updateDebt(debtor._id, {
        amount: amount,
        type: 'subtract',
        notes: `${product.name} uchun to'lov (${product.quantity} dona)`
      });
      
      console.log('Mahsulot to\'lovi muvaffaqiyatli:', response.data);
      
      // Frontendda mahsulotni to'langan qilish
      setDebtHistory(prev => ({
        ...prev,
        products: prev.products.map(p => 
          p.id === product.id 
            ? { ...p, isPaid: true, paidDate: new Date().toISOString() }
            : p
        ),
        payments: [
          {
            id: `${product.id}-payment-${Date.now()}`,
            type: 'product_payment',
            amount: amount,
            method: 'cash',
            date: new Date().toISOString(),
            notes: `${product.name} uchun to'lov`,
            referenceId: product.saleId
          },
          ...prev.payments
        ]
      }));
      
      if (onRefreshDebtors) {
        onRefreshDebtors();
      }
      
      showToast('Mahsulot uchun to\'lov muvaffaqiyatli amalga oshirildi', 'success');
      
    } catch (error) {
      console.error('Mahsulot to\'lovida xatolik:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      showToast(`To'lov amalga oshirilmadi: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Noma\'lum';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }, []);

  const formatCurrency = useCallback((amount) => {
    if (!amount && amount !== 0) return '0 so\'m';
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
  }, []);

  const creditProducts = useMemo(() => {
    return debtHistory.products.filter(product => 
      product.isCredit && !product.isPaid && !product.isRemoved
    );
  }, [debtHistory.products]);

  if (!isOpen || !debtor) return null;

  const tabs = [
    { id: 'products', label: 'Nasiya', icon: FiPackage, count: creditProducts.length },
    { id: 'payments', label: 'To\'lovlar', icon: FiDollarSign, count: debtHistory.payments.length },
    { id: 'removed', label: 'O\'chirilgan', icon: FiTrash2, count: debtHistory.removed.length }
  ];

  const PayModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full animate-scaleIn shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Qarz to'lash
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Joriy qarz: <span className="font-bold text-emerald-600">{formatCurrency(debtor.debtAmount || 0)}</span>
            </p>
          </div>
          <button 
            onClick={() => setShowPayModal(false)} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <FiX size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To'lov miqdori (so'm)
            </label>
            <div className="relative">
              <input
                type="number"
                value={paymentData.amount}
                onChange={(e) => {
                  const value = Math.max(0, parseFloat(e.target.value) || 0);
                  setPaymentData({...paymentData, amount: value.toString()});
                }}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900 transition-all text-lg"
                placeholder="0"
                min="0"
                step="1000"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                so'm
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {[10000, 50000, 100000, debtor.debtAmount || 0].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setPaymentData({...paymentData, amount: amount.toString()})}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              To'lov usuli
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'cash', label: 'Naqd', icon: FiCreditCardIcon, color: 'bg-green-500' },
                { id: 'card', label: 'Karta', icon: FiCreditCardIcon, color: 'bg-blue-500' },
                { id: 'transfer', label: 'O\'tkazma', icon: FiCreditCard, color: 'bg-purple-500' },
                { id: 'other', label: 'Boshqa', icon: FiDollarSign, color: 'bg-gray-500' }
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentData({...paymentData, method: method.id})}
                  className={`p-3 sm:p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${
                    paymentData.method === method.id 
                      ? `${method.color} text-white shadow-lg transform scale-105` 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <method.icon size={18} className="sm:size-5" />
                  <span className="text-xs sm:text-sm font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Izoh (ixtiyoriy)
            </label>
            <textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900 transition-all"
              rows="2"
              placeholder="To'lov haqida izoh..."
            />
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowPayModal(false)}
                className="py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors text-sm sm:text-base"
              >
                Bekor qilish
              </button>
              <button
                onClick={handlePayDebt}
                disabled={actionLoading || !paymentData.amount || parseFloat(paymentData.amount) <= 0}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-lg text-sm sm:text-base"
              >
                {actionLoading ? (
                  <FiRefreshCw className="animate-spin sm:size-5" size={18} />
                ) : (
                  <>
                    <FiDollarSign size={18} className="sm:size-5" />
                    To'lash
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-all duration-300"
        onClick={onClose}
      />
      
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white dark:bg-gray-800 rounded-t-3xl"
        style={{ 
          height: '90vh',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <FiArrowLeft className="text-gray-500 dark:text-gray-400" size={20} />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate max-w-37.5 sm:max-w-none">
                  {debtor.name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {debtor.phone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={loadDebtHistory}
                disabled={loading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl disabled:opacity-50 transition-colors"
                title="Yangilash"
              >
                <FiRefreshCw className={`text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <FiX className="text-gray-500 dark:text-gray-400" size={20} />
              </button>
            </div>
          </div>
          
          {/* Qarz ma'lumotlari */}
          <div className="mt-4 p-3 sm:p-4 bg-linear-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                  Jami qarzi
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(debtor.debtAmount || 0)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                  <FiClock size={12} />
                  Oxirgi: {formatDate(debtor.updatedAt || debtor.createdAt).split(',')[0]}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2 sm:mt-0">
                <button
                  onClick={() => setShowPayModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  <FiDollarSign size={16} />
                  <span>Qarz to'lash</span>
                </button>
                <div className="text-center sm:text-right">
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Nasiya mahsulot
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {creditProducts.length} ta
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={loading}
              className={`relative shrink-0 py-3 px-4 text-center font-medium transition-colors disabled:opacity-50 min-w-25 sm:min-w-30 ${
                activeTab === tab.id
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon size={16} className="sm:size-5" />
                <span className="text-sm sm:text-base whitespace-nowrap">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <FiRefreshCw className="animate-spin text-emerald-600" size={40} />
                <div className="absolute inset-0 bg-linear-to-r from-emerald-400 to-transparent opacity-20 rounded-full blur-xl" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-4 text-base">
                Ma'lumotlar yuklanmoqda...
              </p>
            </div>
          )}

          {/* Mahsulotlar tab */}
          {!loading && activeTab === 'products' && (
            <div className="p-3 sm:p-4">
              {creditProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 mb-4">
                    <FiPackage className="text-gray-400" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nasiya mahsulotlar yo'q
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Ushbu qarzdor uchun nasiya mahsulotlar mavjud emas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {creditProducts.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-1">
                            {item.name}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <FiCalendar size={12} />
                              <span>{formatDate(item.date).split(',')[0]}</span>
                            </div>
                            <div className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 rounded-lg text-xs">
                              📝 Nasiya
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 sm:gap-4 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl">
                            <div>
                              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Miqdor</div>
                              <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                {item.quantity} dona
                              </div>
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Narxi</div>
                              <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(item.price)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-right">
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Jami summa</div>
                          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleProductPayment(item)}
                            disabled={actionLoading}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl font-medium transition-colors flex items-center gap-1 disabled:opacity-50 text-xs sm:text-sm"
                          >
                            <FiDollarSign size={12} className="sm:size-4" />
                            <span>To'lash</span>
                          </button>
                          <button
                            onClick={() => handleRemoveProduct(item)}
                            disabled={actionLoading}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl font-medium transition-colors flex items-center gap-1 disabled:opacity-50 text-xs sm:text-sm"
                          >
                            <FiTrash2 size={12} className="sm:size-4" />
                            <span>O'chirish</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* To'lovlar tab */}
          {!loading && activeTab === 'payments' && (
            <div className="p-3 sm:p-4">
              {debtHistory.payments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 mb-4">
                    <FiDollarSign className="text-gray-400" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    To'lovlar yo'q
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Ushbu qarzdor uchun to'lovlar tarixi mavjud emas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {debtHistory.payments.map((payment) => (
                    <div key={payment.id} className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-green-200 dark:border-green-800">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(payment.amount)}
                            </div>
                            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              payment.method === 'cash' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                            }`}>
                              {payment.method === 'cash' ? '💰 Naqd' : '💳 Karta'}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <FiCalendar size={12} />
                            {formatDate(payment.date)}
                          </div>
                          
                          {payment.notes && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                              {payment.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-green-500 ml-2">
                          <FiCheckCircle size={16} className="sm:size-5" />
                          <span className="text-xs sm:text-sm font-medium hidden sm:inline">To'langan</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* O'chirilganlar tab */}
          {!loading && activeTab === 'removed' && (
            <div className="p-3 sm:p-4">
              {debtHistory.removed.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 mb-4">
                    <FiTrash2 className="text-gray-400" size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    O'chirilganlar yo'q
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Ushbu qarzdor uchun o'chirilgan mahsulotlar mavjud emas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {debtHistory.removed.map((item) => (
                    <div key={item.id} className="relative bg-gray-50 dark:bg-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 border-gray-300 dark:border-gray-700 opacity-90 hover:opacity-100 transition-all">
                      <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-red-400 dark:bg-red-500 transform -translate-y-1/2 rotate-3" />
                      
                      <div className="relative">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-gray-500 dark:text-gray-400 line-through text-sm sm:text-base">
                                {item.name}
                              </h4>
                              <div className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-full text-xs">
                                O'chirilgan
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                              <FiCalendar size={12} />
                              {formatDate(item.date).split(',')[0]}
                            </div>
                            
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs sm:text-sm">
                                <FiAlertCircle size={12} />
                                <span className="font-medium truncate">{item.reason}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-right">
                          <div className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 line-through">
                            {formatCurrency(item.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPayModal && <PayModal />}
    </>
  );
};

export default HistoryModal;