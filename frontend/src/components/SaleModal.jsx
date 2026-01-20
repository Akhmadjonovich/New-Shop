import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  FiX, FiCheck, FiDollarSign, FiRefreshCw, 
  FiCreditCard, FiUser, FiChevronDown, FiSearch,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi';

const SaleModal = ({ 
  isOpen, 
  onClose, 
  cartItems = [], 
  onConfirmSale,
  saleSuccess,
  loading,
  debtors = [],
  onSearchDebtor
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [showDebtorList, setShowDebtorList] = useState(false);
  const [notes, setNotes] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  
  const searchTimeoutRef = useRef(null);
  
  // Barcha qarzdorlarni olish (faol va nofaol)
  const allDebtors = useMemo(() => {
    return (debtors || []);
  }, [debtors]);
  
  // Faol qarzdorlar (qarzi borlar)
  const activeDebtors = useMemo(() => {
    return (debtors || []).filter(d => d.debtAmount > 0);
  }, [debtors]);
  
  // Nofaol qarzdorlar (qarzi yo'q yoki to'langanlar)
  const inactiveDebtors = useMemo(() => {
    return (debtors || []).filter(d => d.debtAmount <= 0);
  }, [debtors]);

  const calculateTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [cartItems]);

  const handleConfirmSale = useCallback(() => {
    if (paymentMethod === 'credit' && !selectedDebtor) {
      setError('Nasiya sotish uchun qarzdorni tanlang!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // 1. Mahsulotlarning narxini tekshirish va to'g'rilash
    const correctedCartItems = cartItems.map(item => {
      // Agar total bo'lmasa yoki noto'g'ri bo'lsa, qayta hisoblash
      const price = item.price || 0;
      const quantity = item.quantity || 1;
      const total = item.total || (price * quantity);
      
      return {
        ...item,
        price: price,
        quantity: quantity,
        total: total
      };
    });

    // 2. Jami summani hisoblash
    const totalAmount = correctedCartItems.reduce((sum, item) => sum + (item.total || 0), 0);

    // 3. Sotish ma'lumotlarini tayyorlash
    const saleData = {
      items: correctedCartItems,
      paymentMethod,
      totalAmount: totalAmount,
      debtorId: paymentMethod === 'credit' ? selectedDebtor?._id : null,
      debtorName: paymentMethod === 'credit' ? selectedDebtor?.name : null,
      debtorPhone: paymentMethod === 'credit' ? selectedDebtor?.phone : null,
      debtorCurrentDebt: paymentMethod === 'credit' ? selectedDebtor?.debtAmount || 0 : 0,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    console.log("✅ Sotish ma'lumotlari tayyor:", saleData);
    
    onConfirmSale(saleData);
  }, [paymentMethod, selectedDebtor, cartItems, notes, onConfirmSale]);

  const handleDebtorSelect = useCallback((debtor) => {
    setSelectedDebtor(debtor);
    setShowDebtorList(false);
    setSearchInput('');
    setSearchResults([]);
    setError(null);
  }, []);

  // Modal yopilganda holatlarni tozalash
  useEffect(() => {
    if (!isOpen) {
      setPaymentMethod('cash');
      setSelectedDebtor(null);
      setNotes('');
      setShowDebtorList(false);
      setSearchInput('');
      setSearchResults([]);
      setSearching(false);
      setError(null);
    }
  }, [isOpen]);

  const formatCurrency = useCallback((amount) => {
    if (!amount && amount !== 0) return '0 UZS';
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  }, []);

  const checkIfOverdue = useCallback((debtor) => {
    if (!debtor.updatedAt || debtor.debtAmount <= 0) return false;
    try {
      const lastUpdate = new Date(debtor.updatedAt);
      const now = new Date();
      const daysDiff = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
      return daysDiff > 30;
    } catch {
      return false;
    }
  }, []);

  // Qidiruvni boshqarish - BARCHA qarzdorlarni qidirish
  useEffect(() => {
    if (searchInput.trim() === '') {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let results = [];
        const query = searchInput.toLowerCase();
        
        if (onSearchDebtor) {
          // Agar onSearchDebtor funksiyasi berilgan bo'lsa
          results = await onSearchDebtor(searchInput);
        } else {
          // Local qidiruv - BARCHA qarzdorlarni qidirish
          results = allDebtors.filter(debtor =>
            (debtor.name?.toLowerCase().includes(query) ||
             debtor.phone?.includes(query) ||
             debtor.notes?.toLowerCase().includes(query))
          );
        }
        
        setSearchResults(results);
      } catch (error) {
        console.error('Qarzdor qidirishda xatolik:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput, onSearchDebtor, allDebtors]);

  // Modal tashqarisiga bosilganda yopish
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Escape tugmasi bosilganda yopish
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Qarzdorlar listi tashqarisiga bosilganda yopish
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDebtorList && !e.target.closest('.debtor-search-container')) {
        setShowDebtorList(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDebtorList]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm backdrop-filter z-40 transition-opacity duration-300"
        onClick={handleBackdropClick}
      />
      
      <div 
        className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
        onClick={handleBackdropClick}
      >
        <div 
          className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slideUp sm:animate-scaleIn max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-t-3xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiCreditCard className="text-emerald-600 dark:text-emerald-400" size={24} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Sotishni tasdiqlash
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Yopish"
              >
                <FiX size={22} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto p-4 sm:p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg flex items-center justify-between">
                <span className="text-sm">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 text-sm"
                >
                  <FiX size={16} />
                </button>
              </div>
            )}
            
            {saleSuccess ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiCheck className="text-green-600 dark:text-green-400" size={36} />
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  Sotish muvaffaqiyatli amalga oshirildi!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Mahsulotlar ombordan chiqarildi
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Savatdagi mahsulotlar */}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Sotilayotgan mahsulotlar
                    </h3>
                    <div className="space-y-4 max-h-100 overflow-y-auto pr-2">
                      {cartItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          Savat bo'sh
                        </div>
                      ) : (
                        cartItems.map((item, index) => (
                          <div key={item._id || index} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Shtrix Kod</div>
                                <div className="font-mono font-bold text-gray-900 dark:text-white">
                                  {item.barcode || 'N/A'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600 dark:text-gray-400">Mahsulot nomi</div>
                                <div className="font-bold text-gray-900 dark:text-white truncate">
                                  {item.name || 'Noma\'lum mahsulot'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Narxi</div>
                                <div className="font-bold text-blue-600 dark:text-blue-400">
                                  {formatCurrency(item.price)}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Soni</div>
                                <div className="font-bold text-green-600 dark:text-green-400">
                                  {item.quantity || 1} dona
                                </div>
                              </div>
                              <div className="col-span-2 text-right pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-600 dark:text-gray-400">Jami narxi</div>
                                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(item.total)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* To'lov ma'lumotlari */}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      To'lov ma'lumotlari
                    </h3>
                    <div className="bg-linear-to-r from-emerald-500 to-green-600 rounded-2xl p-5 mb-6 text-white">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm opacity-90">JAMI SUMMA</div>
                          <div className="text-3xl font-bold mt-1">
                            {formatCurrency(calculateTotal())}
                          </div>
                        </div>
                        <FiDollarSign size={32} className="opacity-80" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* To'lov usuli */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          To'lov usuli
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'cash', label: 'Naqd', color: 'emerald' },
                            { value: 'card', label: 'Karta', color: 'blue' },
                            { value: 'credit', label: 'Nasiya', color: 'purple' }
                          ].map(method => (
                            <button
                              key={method.value}
                              type="button"
                              onClick={() => {
                                setPaymentMethod(method.value);
                                if (method.value !== 'credit') {
                                  setSelectedDebtor(null);
                                }
                              }}
                              className={`p-3 rounded-xl border text-center font-medium transition-all ${
                                paymentMethod === method.value
                                  ? `border-${method.color}-500 bg-${method.color}-50 dark:bg-${method.color}-900/20 text-${method.color}-600 dark:text-${method.color}-400`
                                  : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {method.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Qarzdor tanlash (nasiya uchun) */}
                      {paymentMethod === 'credit' && (
                        <div className="debtor-search-container">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Kimga nasiya? <span className="text-red-500">*</span>
                          </label>
                          
                          <div className="relative mb-2">
                            <div className="relative">
                              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                              <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => {
                                  setSearchInput(e.target.value);
                                  if (e.target.value.trim()) {
                                    setShowDebtorList(true);
                                  }
                                }}
                                onFocus={() => setShowDebtorList(true)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Ism yoki telefon bo'yicha qidirish..."
                              />
                            </div>
                            
                            {/* Qidiruv natijalari */}
                            {showDebtorList && (
                              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {searching ? (
                                  <div className="p-4 text-center text-gray-500">
                                    <FiRefreshCw className="animate-spin mx-auto mb-2" size={18} />
                                    Qidirilmoqda...
                                  </div>
                                ) : searchResults.length > 0 ? (
                                  searchResults.map(debtor => {
                                    const isActive = debtor.debtAmount > 0;
                                    const isOverdue = checkIfOverdue(debtor);
                                    
                                    return (
                                      <button
                                        key={debtor._id}
                                        type="button"
                                        onClick={() => handleDebtorSelect(debtor)}
                                        className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-0"
                                      >
                                        <div className="flex justify-between items-center">
                                          <div className="text-left flex-1">
                                            <div className="font-medium flex items-center gap-2">
                                              {debtor.name}
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${
                                                isActive 
                                                  ? isOverdue 
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                              }`}>
                                                {isActive ? (
                                                  isOverdue ? (
                                                    <><FiAlertCircle size={10} className="mr-0.5" /> O'tgan</>
                                                  ) : (
                                                    <><FiAlertCircle size={10} className="mr-0.5" /> Faol</>
                                                  )
                                                ) : (
                                                  <><FiCheckCircle size={10} className="mr-0.5" /> To'langan</>
                                                )}
                                              </span>
                                            </div>
                                            <div className="text-sm text-gray-500">{debtor.phone}</div>
                                          </div>
                                          <div className="text-right">
                                            {isActive ? (
                                              <>
                                                <div className="text-emerald-600 font-bold">
                                                  {formatCurrency(debtor.debtAmount)}
                                                </div>
                                                {isOverdue && (
                                                  <div className="text-xs text-red-500">
                                                    ⚠️ 30 kun o'tgan
                                                  </div>
                                                )}
                                              </>
                                            ) : (
                                              <div className="text-gray-500 text-sm">Qarzi yo'q</div>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })
                                ) : searchInput ? (
                                  <div className="p-4 text-center text-gray-500">
                                    Hech qanday qarzdor topilmadi
                                  </div>
                                ) : (
                                  <>
                                    {/* Faol qarzdorlar */}
                                    {activeDebtors.length > 0 && (
                                      <div className="p-2">
                                        <div className="text-xs font-medium text-gray-500 mb-1 px-2">Faol qarzdorlar</div>
                                        {activeDebtors.map(debtor => (
                                          <button
                                            key={debtor._id}
                                            type="button"
                                            onClick={() => handleDebtorSelect(debtor)}
                                            className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                                          >
                                            <div className="flex justify-between items-center">
                                              <div className="text-left">
                                                <div className="font-medium">{debtor.name}</div>
                                                <div className="text-sm text-gray-500">{debtor.phone}</div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-emerald-600 font-bold">
                                                  {formatCurrency(debtor.debtAmount)}
                                                </div>
                                                {checkIfOverdue(debtor) && (
                                                  <div className="text-xs text-red-500">
                                                    ⚠️ 30 kun o'tgan
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Nofaol qarzdorlar */}
                                    {inactiveDebtors.length > 0 && (
                                      <div className="p-2">
                                        <div className="text-xs font-medium text-gray-500 mb-1 px-2">To'langan qarzdorlar</div>
                                        {inactiveDebtors.map(debtor => (
                                          <button
                                            key={debtor._id}
                                            type="button"
                                            onClick={() => handleDebtorSelect(debtor)}
                                            className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                                          >
                                            <div className="flex justify-between items-center">
                                              <div className="text-left">
                                                <div className="font-medium">{debtor.name}</div>
                                                <div className="text-sm text-gray-500">{debtor.phone}</div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-gray-500 text-sm">To'langan</div>
                                              </div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {activeDebtors.length === 0 && inactiveDebtors.length === 0 && (
                                      <div className="p-4 text-center text-gray-500">
                                        Hech qanday qarzdor yo'q
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Tanlangan qarzdor */}
                          {selectedDebtor && (
                            <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="text-sm text-emerald-600 dark:text-emerald-400">
                                    Tanlangan qarzdor
                                  </div>
                                  <div className="font-medium">{selectedDebtor.name}</div>
                                  <div className="text-sm text-gray-500">{selectedDebtor.phone}</div>
                                  <div className={`text-sm font-bold mt-1 ${
                                    selectedDebtor.debtAmount > 0 
                                      ? 'text-emerald-600 dark:text-emerald-400' 
                                      : 'text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {selectedDebtor.debtAmount > 0 
                                      ? `Joriy qarz: ${formatCurrency(selectedDebtor.debtAmount)}`
                                      : 'Qarzi yo\'q / To\'langan'
                                    }
                                  </div>
                                  {checkIfOverdue(selectedDebtor) && (
                                    <div className="text-xs text-red-500 mt-1">
                                      ⚠️ 30 kun o'tgan qarz
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDebtor(null);
                                    setSearchInput('');
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  aria-label="Tanlovni bekor qilish"
                                >
                                  <FiX size={18} />
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Agar qarzdor tanlanmagan bo'lsa */}
                          {!selectedDebtor && paymentMethod === 'credit' && (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                                ⚠️ Nasiya sotish uchun qarzdor tanlang yoki yangi qarzdor qo'shing
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Izoh */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Izoh (ixtiyoriy)
                        </label>
                        <textarea 
                          className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          rows="3"
                          placeholder="Sotish haqida izoh..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>

                      {/* Tasdiqlash tugmasi */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={handleConfirmSale}
                          disabled={loading || (paymentMethod === 'credit' && !selectedDebtor)}
                          className="w-full py-4 bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <FiRefreshCw className="animate-spin" />
                              Kutilmoqda...
                            </>
                          ) : (
                            <>
                              <FiCheck size={24} />
                              Sotishni tasdiqlash
                            </>
                          )}
                        </button>
                        
                        {paymentMethod === 'credit' && !selectedDebtor && (
                          <p className="text-red-500 text-sm mt-2 text-center">
                            Nasiya sotish uchun qarzdorni tanlang!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SaleModal;