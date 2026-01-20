import { FiShoppingCart, FiX, FiTrash2, FiPlus, FiMinus, FiShoppingBag, FiCreditCard } from 'react-icons/fi';

const CartModal = ({ 
  isOpen, 
  onClose, 
  cartItems, 
  onRemoveItem, 
  onUpdateQuantity,
  onCheckout,
  loading 
}) => {
  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const totalAmount = calculateTotal();

  if (!isOpen) return null;

  return (
    <>
      {/* Orqa fon - salla ko'rinish */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm backdrop-filter z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Savat modal */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Modal sarlavhasi */}
        <div className="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiShoppingCart className="text-green-600 dark:text-green-400" size={24} />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Savatcha ({cartItems.length})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiX size={22} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Savat kontenti */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <FiShoppingCart className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Savat bo'sh
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Mahsulotlarni skanerlang yoki qo'lda qo'shing
              </p>
            </div>
          ) : (
            <>
              {/* Savatdagi mahsulotlar */}
              <div className="space-y-3 mb-6">
                {cartItems.map((item) => (
                  <div key={item._id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Kod: {item.barcode}</span>
                          <span>•</span>
                          <span>{item.category?.name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item._id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 hover:text-red-600"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Miqdor boshqaruvi */}
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Miqdor:</div>
                        <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                          <button
                            onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-l-lg"
                          >
                            <FiMinus size={18} />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => onUpdateQuantity(item._id, parseInt(e.target.value) || 1)}
                            className="w-16 text-center bg-transparent border-x border-gray-300 dark:border-gray-600 py-2 text-gray-900 dark:text-white"
                            min="1"
                          />
                          <button
                            onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-r-lg"
                          >
                            <FiPlus size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Narx */}
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Jami:</div>
                        <div className="font-bold text-lg text-green-600 dark:text-green-400">
                          {item.total?.toLocaleString()} UZS
                        </div>
                        <div className="text-sm text-gray-500">
                          (Birlik: {item.price?.toLocaleString()} UZS)
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Jami summa */}
              <div className="bg-linear-to-r from-green-500 to-emerald-600 rounded-2xl p-5 mb-6 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm opacity-90">JAMI SUMMA</div>
                    <div className="text-3xl font-bold mt-1">
                      {totalAmount.toLocaleString()} UZS
                    </div>
                  </div>
                  <FiShoppingBag size={32} className="opacity-80" />
                </div>
              </div>

              {/* Harakatlar */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (window.confirm('Savatni tozalashni tasdiqlaysizmi?')) {
                      cartItems.forEach(item => onRemoveItem(item._id));
                    }
                  }}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Savatni tozalash
                </button>
                <button
                  onClick={onCheckout}
                  disabled={loading}
                  className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FiCreditCard />
                  {loading ? 'Kutilmoqda...' : 'Sotish'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartModal;