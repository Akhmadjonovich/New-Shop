import { 
  FiPackage, 
  FiTag, 
  FiDollarSign, 
  FiHash, 
  FiEdit2, 
  FiTrash2,
  FiAlertCircle,
  FiTrendingUp,
  FiPercent,
  FiChevronRight,
  FiChevronLeft,
  FiX,
  FiSave,
  FiChevronDown
} from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { productAPI } from '../services/api';

const ProductTable = ({ products, loading, error, onDelete }) => {
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    cost: '',
    quantity: '',
    unit: 'dona',
    description: '',
    minStock: '10'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  
  const itemsPerPage = 10;

  // O'lchov birliklari
  const units = [
    { value: 'dona', label: 'Dona' },
    { value: 'kg', label: 'Kilogramm' },
    { value: 'litr', label: 'Litr' },
    { value: 'metr', label: 'Metr' },
    { value: 'quti', label: 'Quti' },
    { value: 'paket', label: 'Paket' },
  ];

  // Pagination hisoblash
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = products.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(products.length / itemsPerPage);

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name || '',
      barcode: product.barcode || '',
      price: product.price?.toString() || '',
      cost: product.cost?.toString() || '',
      quantity: product.quantity?.toString() || '',
      unit: product.unit || 'dona',
      description: product.description || '',
      minStock: product.minStock?.toString() || '10'
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    // Validatsiya
    if (!editFormData.name.trim()) {
      setEditError('Mahsulot nomini kiriting');
      return;
    }
    if (!editFormData.price || Number(editFormData.price) <= 0) {
      setEditError('Sotish narxini to\'g\'ri kiriting');
      return;
    }
    if (!editFormData.cost || Number(editFormData.cost) <= 0) {
      setEditError('Xarajat narxini to\'g\'ri kiriting');
      return;
    }
    if (!editFormData.quantity || Number(editFormData.quantity) < 0) {
      setEditError('Miqdorni to\'g\'ri kiriting');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const updateData = {
        name: editFormData.name,
        barcode: editFormData.barcode,
        price: Number(editFormData.price),
        cost: Number(editFormData.cost),
        quantity: Number(editFormData.quantity),
        unit: editFormData.unit,
        description: editFormData.description,
        minStock: Number(editFormData.minStock)
      };

      console.log('Updating product:', editingProduct._id, updateData);
      
      // API chaqiruvi
      const response = await productAPI.update(editingProduct._id, updateData);
      
      if (response.data.success) {
        // Yangilangan mahsulotni ko'rsatish uchun ota komponentga bildirish
        // Bu yerda siz o'zingizning state yangilash logikangizni qo'shishingiz kerak
        setEditingProduct(null);
        // Sahifani yangilash yoki mahsulotlar ro'yxatini qayta yuklash
        window.location.reload(); // Oddiy yechim
      } else {
        setEditError(response.data.message || 'Yangilashda xatolik');
      }
    } catch (err) {
      console.error('Edit error:', err);
      setEditError(err.response?.data?.message || 'Server xatosi. Iltimos, qayta urinib ko\'ring.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUnitChange = (unit) => {
    setEditFormData(prev => ({ ...prev, unit }));
    setShowUnitDropdown(false);
  };

  // Tahrirlash modalini ko'rsatish
  const renderEditModal = () => {
    if (!editingProduct) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-2">
              <FiPackage className="text-blue-600 dark:text-blue-400" size={20} />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mahsulotni Tahrirlash
              </h2>
            </div>
            <button
              onClick={() => setEditingProduct(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiX size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {editError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mahsulot Nomi *
                </label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditChange}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white transition-all duration-300"
                  placeholder="Mahsulot nomi"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shtrix Kod
                </label>
                <input
                  type="text"
                  name="barcode"
                  value={editFormData.barcode}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white transition-all duration-300"
                  placeholder="Shtrix kod"
                />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Xarajat Narxi (UZS) *
                  </label>
                  <input
                    type="number"
                    name="cost"
                    value={editFormData.cost}
                    onChange={handleEditChange}
                    required
                    min="0"
                    step="100"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white transition-all duration-300"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sotish Narxi (UZS) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={editFormData.price}
                    onChange={handleEditChange}
                    required
                    min="0"
                    step="100"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white transition-all duration-300"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Quantity and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Miqdor *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={editFormData.quantity}
                    onChange={handleEditChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white transition-all duration-300"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    O'lchov Birligi
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                    >
                      <span>{units.find(u => u.value === editFormData.unit)?.label}</span>
                      <FiChevronDown size={16} />
                    </button>
                    
                    {showUnitDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setShowUnitDropdown(false)}
                        />
                        
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                          <div className="p-1">
                            {units.map((unit) => (
                              <button
                                key={unit.value}
                                type="button"
                                onClick={() => handleUnitChange(unit.value)}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded flex items-center justify-between"
                              >
                                {unit.label}
                                {editFormData.unit === unit.value && (
                                  <FiChevronRight className="text-blue-600 dark:text-blue-400" size={14} />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Izoh
                </label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditChange}
                  rows="3"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white transition-all duration-300 resize-none"
                  placeholder="Qo'shimcha ma'lumotlar..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-300 rounded-lg font-medium transition-all duration-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {editLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saqlanmoqda...
                    </>
                  ) : (
                    <>
                      <FiSave size={16} />
                      Saqlash
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <FiAlertCircle className="mx-auto text-red-500" size={48} />
        <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <FiPackage className="mx-auto text-gray-400" size={48} />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Mahsulotlar topilmadi</p>
      </div>
    );
  }

  // Jadval ko'rinishi
  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Jadval - scroll qilinadigan qism */}
      <div className="overflow-x-auto" style={{ maxHeight: '500px' }}>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                T/R
              </th>
              <th className="sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FiPackage size={14} />
                  Mahsulot nomi
                </div>
              </th>
              <th className="sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FiTag size={14} />
                  Narxi
                </div>
              </th>
              <th className="sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FiHash size={14} />
                  Miqdori
                </div>
              </th>
              <th className="sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FiTrendingUp size={14} />
                  Jami Foyda
                </div>
              </th>
              <th className="sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FiDollarSign size={14} />
                  Umumiy summa
                </div>
              </th>
              <th className="sticky top-0 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                Harakat
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {currentProducts.map((product, index) => {
              const cost = Number(product.cost || 0);
              const price = Number(product.price || 0);
              const quantity = Number(product.quantity || 0);
              const totalProfit = (price - cost) * quantity;
              const totalAmount = price * quantity;
              const profitPercent = cost > 0 ? ((price - cost) / cost * 100) : 0;
              
              return (
                <tr key={product._id || product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800">
                    {indexOfFirstItem + index + 1}
                  </td>
                  <td className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        quantity > 10 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                        quantity > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        <FiPackage size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {product.category?.name || 'Kategoriya mavjud emas'}
                          {product.barcode && ` • #${product.barcode}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-800">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Xarajat: <span className="font-medium">{cost.toLocaleString()} UZS</span>
                      </div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {price.toLocaleString()} UZS
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        quantity <= 5 ? 'text-red-600 dark:text-red-400' : 
                        quantity <= 10 ? 'text-yellow-600 dark:text-yellow-400' : 
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {quantity}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {product.unit || 'dona'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-800">
                    <div className={`text-sm font-bold ${
                      totalProfit > 0 ? 'text-green-600 dark:text-green-400' : 
                      totalProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {totalProfit.toLocaleString()} UZS
                    </div>
                    {cost > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FiPercent size={10} />
                        {profitPercent.toFixed(1)}%
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap border-b border-gray-200 dark:border-gray-800">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {totalAmount.toLocaleString()} UZS
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditClick(product)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(product._id || product.id)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination - pastki qismda */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, products.length)}/{products.length} mahsulot
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft size={16} />
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tahrirlash modali */}
      {renderEditModal()}
    </div>
  );
};

export default ProductTable;