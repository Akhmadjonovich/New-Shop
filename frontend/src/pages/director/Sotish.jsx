import { useState, useEffect, useCallback } from "react";
import {
  FiSearch,
  FiCamera,
  FiShoppingCart,
  FiShoppingBag,
  FiCreditCard,
  FiRefreshCw,
  FiPackage,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiX,
  FiArrowRight
} from "react-icons/fi";
import { productAPI, saleAPI, debtorAPI } from "../../services/api"; // ✅ debtorAPI qo'shildi
import ScannerModal from "../../components/ScannerModal";
import CartModal from "../../components/CartModal";
import SaleModal from "../../components/SaleModal";

const Sotish = () => {
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [scannedProduct, setScannedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [saleLoading, setSaleLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState({});
  const [debtors, setDebtors] = useState([]);
  const [debtorsLoading, setDebtorsLoading] = useState(false);

  // Mahsulotlarni yuklash
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAll();
      if (response.data.success) {
        setProducts(response.data.data || []);
      }
    } catch (err) {
      console.error("Mahsulotlarni yuklashda xatolik:", err);
      setError("Mahsulotlarni yuklashda xatolik");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Qarzdorlarni yuklash
// Sotish.jsx - loadDebtors funksiyasini yangilash
const loadDebtors = async () => {
  try {
    setDebtorsLoading(true);
    const response = await debtorAPI.getAll();
    if (response.data.success) {
      const debtorsData = response.data.data || [];
      console.log("✅ Qarzdorlar yuklandi:", {
        count: debtorsData.length,
        withDebt: debtorsData.filter(d => d.debtAmount > 0).length
      });
      
      // Har bir qarzdorning debtAmount ni ta'minlash
      const validatedDebtors = debtorsData.map(debtor => ({
        ...debtor,
        debtAmount: debtor.debtAmount || 0
      }));
      
      setDebtors(validatedDebtors);
    }
  } catch (err) {
    console.error("❌ Qarzdorlarni yuklashda xatolik:", err);
    // Agar API ishlamasa, bo'sh array qo'ydik
    setDebtors([]);
  } finally {
    setDebtorsLoading(false);
  }
};

  // Qarzdor qidirish funksiyasi
  const searchDebtor = useCallback(async (query) => {
    if (!query || !query.trim()) {
      return [];
    }
    
    try {
      const response = await debtorAPI.search({ query });
      return response.data?.data || [];
    } catch (error) {
      console.error("Qarzdor qidirishda xatolik:", error);
      // Agar API xatosi bo'lsa, local qidiruv
      const queryLower = query.toLowerCase();
      return debtors.filter(debtor => 
        (debtor.name?.toLowerCase().includes(queryLower) ||
         debtor.phone?.includes(query) ||
         debtor.notes?.toLowerCase().includes(queryLower)) &&
        debtor.debtAmount > 0
      );
    }
  }, [debtors]);

  const handleScan = async (barcode) => {
    if (!barcode) return;

    try {
      setLoading(true);
      const response = await productAPI.getByBarcode(barcode);

      if (response.data.success && response.data.data) {
        const product = response.data.data;
        setScannedProduct(product);
      } else {
        setError(`Shtrix kod: ${barcode} bo'yicha mahsulot topilmadi`);
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error("Skanerlashda xatolik:", err);
      setError("Skanerlashda xatolik yuz berdi");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product, quantity = 1) => {
    if (!product.quantity || product.quantity <= 0) {
      setError(`"${product.name}" omborda qolmagan`);
      setTimeout(() => setError(null), 3000);
      return false;
    }

    if (product.quantity < quantity) {
      setError(`Faqat ${product.quantity} dona qolgan`);
      setTimeout(() => setError(null), 3000);
      return false;
    }

    const existingItem = cartItems.find((item) => item._id === product._id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.quantity < newQuantity) {
        setError(
          `Faqat ${product.quantity} dona qolgan, ${existingItem.quantity} dona allaqachon savatda`
        );
        setTimeout(() => setError(null), 3000);
        return false;
      }

      setCartItems(
        cartItems.map((item) =>
          item._id === product._id
            ? {
                ...item,
                quantity: newQuantity,
                total: (item.price || 0) * newQuantity,
              }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          ...product,
          quantity,
          total: (product.price || 0) * quantity,
        },
      ]);
    }

    setAddedToCart(prev => ({
      ...prev,
      [product._id]: true
    }));

    setTimeout(() => {
      setAddedToCart(prev => ({
        ...prev,
        [product._id]: false
      }));
    }, 3000);

    return true;
  };

  const handleAddFromScanner = () => {
    if (!scannedProduct) return;
    
    const success = addToCart(scannedProduct, 1);
    if (success) {
      setTimeout(() => {
        setScannedProduct(null);
      }, 1500);
    }
  };

  const handleManualSearch = (product) => {
    addToCart(product, 1);
    setSearchTerm("");
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter((item) => item._id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    const item = cartItems.find((item) => item._id === productId);
    const originalProduct = products.find((p) => p._id === productId);

    if (originalProduct && originalProduct.quantity < newQuantity) {
      setError(`Faqat ${originalProduct.quantity} dona qolgan`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setCartItems(
      cartItems.map((item) =>
        item._id === productId
          ? {
              ...item,
              quantity: newQuantity,
              total: (item.price || 0) * newQuantity,
            }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

// Sotish.jsx - handleSale funksiyasi
const handleSale = async (saleData) => {
  try {
    setSaleLoading(true);
    setError(null);
    
    console.log("🎯 Sotish boshlanmoqda...", saleData);
    
    // 1. Narxlarni to'g'ri hisoblash
    const correctedItems = saleData.items.map(item => {
      const price = item.price || 0;
      const quantity = item.quantity || 1;
      const total = price * quantity;
      
      return {
        ...item,
        price: price,
        quantity: quantity,
        total: total
      };
    });
    
    // 2. Jami summani hisoblash
    const correctTotal = correctedItems.reduce((sum, item) => sum + item.total, 0);
    
    console.log("💰 Hisoblangan summalar:");
    console.log(" - Mahsulotlar:", correctedItems.length);
    console.log(" - Jami summa:", correctTotal);
    console.log(" - To'lov usuli:", saleData.paymentMethod);
    console.log(" - Qarzdor:", saleData.debtorName);
    
    // 3. API ma'lumotlarini tayyorlash
    const formattedData = {
      items: correctedItems.map(item => ({
        product: item._id,
        productName: item.name,
        barcode: item.barcode || "N/A",
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      totalAmount: correctTotal,
      paymentMethod: saleData.paymentMethod,
      notes: saleData.notes || "",
      debtorId: saleData.paymentMethod === 'credit' ? saleData.debtorId : null,
      debtorName: saleData.paymentMethod === 'credit' ? saleData.debtorName : null,
      debtorPhone: saleData.paymentMethod === 'credit' ? saleData.debtorPhone : null
    };
    
    console.log("📤 API ga yuborilayotgan ma'lumotlar:", formattedData);
    
    // 4. API ga yuborish
    const response = await saleAPI.create(formattedData);
    
    console.log("✅ API javobi:", response.data);
    
    if (response.data.success) {
      // 5. Muvaffaqiyatli javob
      setSaleSuccess(true);
      setCartItems([]);
      setScannedProduct(null);
      
      // 6. Qarzdorlarni yangilash
      await loadDebtors();
      
      // 7. Mahsulotlarni yangilash
      setTimeout(() => {
        loadProducts();
      }, 500);
      
      // 8. Modalni yopish
      setTimeout(() => {
        setSaleSuccess(false);
        setShowSaleModal(false);
      }, 1500);
      
    } else {
      throw new Error(response.data.message || "Sotishda xatolik");
    }
    
  } catch (err) {
    console.error("❌ Sotishda xatolik:", err);
    
    let errorMessage = "Sotishda xatolik yuz berdi";
    
    if (err.response) {
      // Server xatolari
      const serverError = err.response.data;
      errorMessage = serverError.message || `Server xatosi: ${err.response.status}`;
      
      if (serverError.errors) {
        errorMessage += ` - ${serverError.errors.join(', ')}`;
      }
      
    } else if (err.request) {
      // Ulanish xatolari
      errorMessage = "Serverga ulanib bo'lmadi. Internet aloqasini tekshiring.";
    } else {
      // Boshqa xatolar
      errorMessage = err.message || "Noma'lum xatolik";
    }
    
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
    
  } finally {
    setSaleLoading(false);
  }
};

  const clearCart = () => {
    if (window.confirm("Savatni tozalashni tasdiqlaysizmi?")) {
      setCartItems([]);
      setError(null);
    }
  };

  // Birinchi yuklash
  useEffect(() => {
    loadProducts();
  }, []);

  // SaleModal ochilganda qarzdorlarni yuklash
  useEffect(() => {
    if (showSaleModal) {
      loadDebtors();
    }
  }, [showSaleModal]);

  const filteredProducts = searchTerm
    ? products.filter(
        (product) =>
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.barcode?.toString().includes(searchTerm) ||
          product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className="py-6 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Sotish Bo'limi
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Mahsulotlarni skanerlang va tez sotishni amalga oshiring
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <FiX size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <FiSearch className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Mahsulot qidirish
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Shtrix kod orqali qidiring
                </p>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">
              {products.length}
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Mahsulot nomi yoki shtrix kodi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white"
                disabled={loading}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX size={18} />
                </button>
              )}
            </div>

            {searchTerm && filteredProducts.length > 0 && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-3 max-h-60 overflow-y-auto">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Topildi: {filteredProducts.length} ta
                </div>
                <div className="space-y-2">
                  {filteredProducts.slice(0, 5).map((product) => (
                    <div
                      key={product._id}
                      className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => handleManualSearch(product)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {product.barcode} • {product.category?.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Qoldiq: {product.quantity} dona
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600 dark:text-green-400">
                            {product.price?.toLocaleString()} UZS
                          </div>
                          <button className="mt-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs">
                            Qo'shish
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowScannerModal(true)}
            disabled={loading}
            className="w-full py-4 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiCamera size={24} />
            {loading ? "Yuklanmoqda..." : "Skanerlashni boshlash"}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <FiShoppingBag className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Sotish
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Mahsulotlarni sotish
                </p>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold">
              {cartItems.length} dona
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-linear-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="text-sm opacity-90">Jami summa</div>
              <div className="text-2xl font-bold mt-1">
                {calculateTotal().toLocaleString()} UZS
              </div>
            </div>
            <div className="bg-linear-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <div className="text-sm opacity-90">Mahsulotlar</div>
              <div className="text-2xl font-bold mt-1">
                {cartItems.length} dona
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Savatchadagi mahsulotlar
            </h3>
            
            {cartItems.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 text-center">
                <FiShoppingCart className="mx-auto text-gray-400 dark:text-gray-600 mb-3" size={32} />
                <p className="text-gray-600 dark:text-gray-400">
                  Savatcha bo'sh. Mahsulot qo'shing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.slice(0, 3).map(item => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <FiPackage className="text-blue-600 dark:text-blue-400" size={18} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} dona × {item.price?.toLocaleString()} UZS
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-green-600 dark:text-green-400">
                      {item.total?.toLocaleString()} UZS
                    </div>
                  </div>
                ))}
                
                {cartItems.length > 3 && (
                  <div className="text-center text-blue-600 dark:text-blue-400 text-sm">
                    + {cartItems.length - 3} ta yana mahsulot
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowCartModal(true)}
              disabled={cartItems.length === 0}
              className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                cartItems.length === 0
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105'
              } flex items-center justify-center gap-2`}
            >
              <FiShoppingCart size={20} />
              Savatni ko'rish ({cartItems.length})
            </button>
            
            <button
              onClick={() => setShowSaleModal(true)}
              disabled={cartItems.length === 0 || saleLoading}
              className={`w-full py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
                cartItems.length === 0 || saleLoading
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white transform hover:scale-105 shadow-lg hover:shadow-xl'
              } flex items-center justify-center gap-2`}
            >
              {saleLoading ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  Kutilmoqda...
                </>
              ) : (
                <>
                  <FiCreditCard size={24} />
                  Sotishni yakunlash
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal lar */}
      <ScannerModal
        isOpen={showScannerModal}
        onClose={() => {
          setShowScannerModal(false);
          setScannedProduct(null);
        }}
        onScan={handleScan}
        scannedProduct={scannedProduct}
        loading={loading}
        error={error}
        onAddToCart={handleAddFromScanner}
        isAddedToCart={scannedProduct ? addedToCart[scannedProduct._id] : false}
      />

      <CartModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        cartItems={cartItems}
        onRemoveItem={removeFromCart}
        onUpdateQuantity={updateQuantity}
        onCheckout={() => {
          setShowCartModal(false);
          setShowSaleModal(true);
        }}
        loading={saleLoading}
        onClearCart={clearCart}
      />

      <SaleModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        cartItems={cartItems}
        onConfirmSale={handleSale}
        saleSuccess={saleSuccess}
        loading={saleLoading}
        debtors={debtors} // ✅ Qarzdorlar berildi
        onSearchDebtor={searchDebtor} // ✅ Qidirish funksiyasi berildi
      />

      {saleSuccess && (
        <div className="fixed bottom-4 right-4 z-50 animate-fadeIn">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <FiCheck size={20} />
            <span className="font-semibold">Sotish muvaffaqiyatli amalga oshirildi!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sotish;