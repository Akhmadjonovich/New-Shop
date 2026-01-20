import { useState, useEffect, useRef } from 'react';
import { 
  FiSearch, 
  FiFilter, 
  FiGrid, 
  FiList, 
  FiPlus, 
  FiFolderPlus,
  FiRefreshCw,
  FiChevronDown,
  FiAlertCircle,
  FiX,
  FiFolder,
  FiCheck,
  FiEdit2,
  FiTrash2
} from 'react-icons/fi';
import AddCategory from '../../components/AddCategory';
import AddProduct from '../../components/AddProduct';
import ProductTable from '../../components/ProductTable';
import { categoryAPI, productAPI } from '../../services/api';

const Ombor = () => {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Kategoriyalarni yuklash
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await categoryAPI.getAll();
      
      if (response.data.success) {
        setCategories(response.data.data);
      } else {
        setError(response.data.message || 'Kategoriyalarni yuklashda xatolik');
      }
    } catch (err) {
      console.error('Categories load error:', err);
      
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network')) {
        setError('Backend server ishlamayapti. Iltimos, backend ni ishga tushiring.');
      } else {
        setError('Kategoriyalarni yuklashda xatolik: ' + (err.message || 'Noma\'lum xato'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Mahsulotlarni yuklash
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (filterType !== 'all') {
        params.status = filterType;
      }

      const response = await productAPI.getAll(params);
      
      if (response.data.success) {
        const allProducts = response.data.data;
        setProducts(allProducts);
        
        if (debouncedSearch) {
          filterAndHighlightProducts(allProducts, debouncedSearch);
        } else {
          setFilteredProducts(allProducts);
        }
      } else {
        setError(response.data.message || 'Mahsulotlarni yuklashda xatolik');
        setFilteredProducts([]);
      }
    } catch (err) {
      console.error('Products load error:', err);
      
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network')) {
        setError('Backend server ishlamayapti');
      } else {
        setError('Mahsulotlarni yuklashda xatolik');
      }
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Mahsulotlarni filtrlash
  const filterAndHighlightProducts = (products, search) => {
    const searchLower = search.toLowerCase();
    const filtered = products.filter(product => {
      const productName = product.name?.toLowerCase() || '';
      const categoryName = product.category?.name?.toLowerCase() || '';
      const barcode = product.barcode?.toLowerCase() || '';
      
      return productName.includes(searchLower) || 
             categoryName.includes(searchLower) ||
             barcode.includes(searchLower);
    });
    
    setFilteredProducts(filtered);
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Dastlabki yuklash
  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  // Filter o'zgarishlari
  useEffect(() => {
    loadProducts();
  }, [selectedCategory, debouncedSearch, filterType]);

  // Mahsulot qo'shishdan keyin yangilash
  const handleProductAdded = () => {
    loadProducts();
    setShowAddProduct(false);
    loadCategories();
  };

  // Kategoriya qo'shishdan keyin yangilash
  const handleCategoryAdded = () => {
    loadCategories();
    setShowAddCategory(false);
  };

  // Mahsulotni o'chirish
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Mahsulotni o\'chirishni tasdiqlaysizmi?')) return;
    
    try {
      await productAPI.delete(productId);
      loadProducts();
    } catch (err) {
      alert('O\'chirishda xatolik yuz berdi: ' + err.message);
    }
  };

  // Kategoriya tanlash
  const handleCategorySelect = (category) => {
    setSelectedCategory(category._id || category.id);
    setSelectedCategoryName(category.name);
    setShowCategoriesModal(false);
  };

  // Barcha kategoriyalarni tanlash
  const handleAllCategories = () => {
    setSelectedCategory(null);
    setSelectedCategoryName('');
    setShowCategoriesModal(false);
  };

  // Kategoriyani tahrirlash
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowCategoriesModal(false);
    setShowAddCategory(true);
  };

  // Kategoriyani o'chirish
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Bu kategoriyani o\'chirishni istaysizmi? Kategoriyaga bog\'liq mahsulotlar "Kategoriyasiz" bo\'lib qoladi.')) {
      return;
    }
    
    try {
      setDeletingCategoryId(categoryId);
      const response = await categoryAPI.delete(categoryId);
      
      if (response.data.success) {
        // Kategoriyani ro'yxatdan o'chirish
        setCategories(categories.filter(cat => cat._id !== categoryId));
        
        // Agar tanlangan kategoriya o'chirilgan bo'lsa, tanlashni bekor qilish
        if (selectedCategory === categoryId) {
          setSelectedCategory(null);
          setSelectedCategoryName('');
        }
      } else {
        alert(response.data.message || 'O\'chirishda xatolik');
      }
    } catch (err) {
      console.error('Delete category error:', err);
      alert(err.response?.data?.message || 'Server xatosi');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  // Searchni tozalash
  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearch('');
  };

  // Kategoriyalar modalini ko'rsatish
  const renderCategoriesModal = () => {
    if (!showCategoriesModal) return null;

    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md"
          onClick={() => setShowCategoriesModal(false)}
        />
        
        {/* Modal - pastki qismda */}
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slideUp"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: '80vh' }}
        >
          {/* Modal sarlavhasi */}
          <div className="sticky top-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiFolder className="text-blue-600 dark:text-blue-400" size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Kategoriyalar
                </h2>
              </div>
              <button
                onClick={() => setShowCategoriesModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiX size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Modal kontenti */}
          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 60px)' }}>
            {/* YANGI KATEGORIYA QO'SHISH TUGMASI - BIRINCHI */}
            <button
              onClick={() => {
                setShowCategoriesModal(false);
                setShowAddCategory(true);
                setEditingCategory(null); // Yangi kategoriya rejimi
              }}
              className="w-full mb-4 flex items-center justify-center gap-2 p-4 bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FiFolderPlus size={18} />
              Yangi kategoriya qo'shish
            </button>

            {/* Barcha kategoriyalar tugmasi */}
            <button
              onClick={handleAllCategories}
              className={`w-full flex items-center justify-between p-4 mb-3 rounded-xl border transition-all duration-300 ${
                !selectedCategory 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                  <FiFolder size={18} className="text-gray-600 dark:text-gray-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Barcha mahsulotlar</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Hamma kategoriyalardagi mahsulotlar</div>
                </div>
              </div>
              {!selectedCategory && (
                <FiCheck className="text-blue-600 dark:text-blue-400" size={20} />
              )}
            </button>

            {/* Kategoriyalar ro'yxati */}
            <div className="space-y-2">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <div
                    key={category._id || category.id}
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedCategory === (category._id || category.id)
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' 
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {/* Kategoriya ma'lumotlari */}
                    <button
                      onClick={() => handleCategorySelect(category)}
                      className="flex-1 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: category.color || '#6b7280' }}
                        >
                          <FiFolder size={18} className="text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{category.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {category.productCount || 0} ta mahsulot
                          </div>
                        </div>
                      </div>
                      {selectedCategory === (category._id || category.id) && (
                        <FiCheck className="text-blue-600 dark:text-blue-400" size={20} />
                      )}
                    </button>

                    {/* Tahrirlash va o'chirish tugmalari (DOIMIY KO'RINADI) */}
                    <div className="ml-3 flex items-center gap-1">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Tahrirlash"
                        disabled={deletingCategoryId === category._id}
                      >
                        <FiEdit2 size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteCategory(category._id || category.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="O'chirish"
                        disabled={deletingCategoryId === category._id}
                      >
                        {deletingCategoryId === category._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <FiTrash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <FiFolder className="mx-auto mb-2 text-gray-400" size={24} />
                  <p>Hozircha kategoriyalar mavjud emas</p>
                  <p className="text-sm mt-1">"Yangi kategoriya qo'shish" tugmasi orqali kategoriya yarating</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  if (error && error.includes('Backend server')) {
    return (
      <div className="py-8 px-4">
        <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FiAlertCircle className="text-red-600 dark:text-red-400" size={24} />
            <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
              Backend ulanmagan
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // Aktual mahsulotlarni ko'rsatish
  const displayProducts = debouncedSearch ? filteredProducts : products;

  return (
    <div className="py-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            Ombor Boshqaruvi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Barcha mahsulotlar va kategoriyalarni boshqaring
          </p>
        </div>

        <div className="flex gap-3">
          {/* Kategoriyalar tugmasi */}
          <button
            onClick={() => setShowCategoriesModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            disabled={loading}
          >
            <FiFolder size={20} />
            <span className="hidden sm:inline">
              {selectedCategoryName || 'Kategoriyalar'}
            </span>
          </button>
          
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            disabled={loading}
          >
            <FiPlus size={20} />
            <span className="hidden sm:inline">Mahsulot</span>
          </button>
        </div>
      </div>

      {/* Filter va Search */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-xl p-4 mb-6 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Mahsulot nomi, kategoriya yoki shtrix kod bo'yicha qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white transition-all duration-300"
                disabled={loading}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FiX size={18} />
                </button>
              )}
            </div>
            
            {/* Search natijalari */}
            {debouncedSearch && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {filteredProducts.length > 0 ? (
                  <span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {filteredProducts.length}
                    </span> ta mahsulot topildi
                  </span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Hech qanday mahsulot topilmadi
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Xatolik ko'rsatish */}
      {error && !error.includes('Backend server') && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="text-red-600 dark:text-red-400" size={20} />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Tanlangan kategoriya ko'rsatish */}
      {selectedCategoryName && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FiFolder className="text-blue-600 dark:text-blue-400" size={18} />
              </div>
              <div>
                <div className="font-semibold text-blue-700 dark:text-blue-300">
                  {selectedCategoryName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {displayProducts.length} ta mahsulot
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedCategoryName('');
              }}
              className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/40 rounded-lg transition-colors"
            >
              Barcha mahsulotlar
            </button>
          </div>
        </div>
      )}

      {/* Mahsulotlar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-xl p-4 md:p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {debouncedSearch ? (
              <>
                <span className="text-blue-600 dark:text-blue-400">"</span>
                <span className="text-blue-600 dark:text-blue-400">{debouncedSearch}</span>
                <span className="text-blue-600 dark:text-blue-400">"</span>
                <span className="ml-2">qidiruvi natijalari</span>
              </>
            ) : selectedCategoryName ? (
              `${selectedCategoryName}dagi mahsulotlar`
            ) : (
              'Barcha mahsulotlar'
            )}
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({displayProducts.length} ta)
            </span>
          </h2>
        </div>

        <ProductTable
          products={displayProducts}
          loading={loading}
          error={error}
          onDelete={handleDeleteProduct}
        />
      </div>

      {/* Kategoriyalar modali */}
      {renderCategoriesModal()}

      {/* Modallar */}
      {showAddCategory && (
        <AddCategory
          onClose={() => {
            setShowAddCategory(false);
            setEditingCategory(null);
          }}
          onSuccess={handleCategoryAdded}
          categories={categories}
          setCategories={setCategories}
          editingCategory={editingCategory}
        />
      )}

      {showAddProduct && (
        <AddProduct
          onClose={() => setShowAddProduct(false)}
          onSuccess={handleProductAdded}
          categories={categories}
        />
      )}
    </div>
  );
};

export default Ombor;