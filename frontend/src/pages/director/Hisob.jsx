import { useState, useEffect } from 'react';
import {
  FiUserPlus,
  FiSearch,
  FiEye,
  FiTrash2,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiDollarSign,
  FiCalendar,
  FiUsers,
  FiCheckCircle,
  FiAlertCircle,
  FiPlusCircle,
  FiMinusCircle,
  FiClock,
  FiX,
  FiAlertTriangle,
  FiChevronRight,
  FiCreditCard,
  FiTrendingUp,
  FiTrendingDown
} from 'react-icons/fi';
import AddDebtor from '../../components/AddDebtor';
import HistoryModal from '../../components/HistoryModal';
import { debtorAPI } from '../../services/api';

const Hisob = () => {
  // State'lar
  const [debtors, setDebtors] = useState([]);
  const [activeDebtors, setActiveDebtors] = useState([]);
  const [inactiveDebtors, setInactiveDebtors] = useState([]);
  const [filteredActiveDebtors, setFilteredActiveDebtors] = useState([]);
  const [filteredInactiveDebtors, setFilteredInactiveDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'inactive'
  const [stats, setStats] = useState({
    totalDebtors: 0,
    activeDebtors: 0,
    inactiveDebtors: 0,
    totalDebt: 0,
    averageDebt: 0,
    overdueDebtors: 0
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [debtorToDelete, setDebtorToDelete] = useState(null);

  // Qarzdorlarni yuklash va bo'limlarga ajratish
  const loadDebtors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await debtorAPI.getAll();
      const data = res.data.data || [];
      
      // Ma'lumotlarni formatlash
      const updatedData = data.map(debtor => {
        const lastUpdate = new Date(debtor.updatedAt || debtor.createdAt);
        const now = new Date();
        const daysDiff = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
        
        return {
          ...debtor,
          debtAmount: debtor.debtAmount || 0,
          isOverdue: daysDiff > 30 && (debtor.debtAmount || 0) > 0,
          overdueDays: daysDiff,
          lastUpdated: lastUpdate,
          isActive: (debtor.debtAmount || 0) > 0,
          status: (debtor.debtAmount || 0) > 0 ? 'active' : 'inactive'
        };
      });
      
      setDebtors(updatedData);
      
      // Faol va nofaol qarzdorlarni ajratish
      const active = updatedData.filter(d => (d.debtAmount || 0) > 0);
      const inactive = updatedData.filter(d => (d.debtAmount || 0) <= 0);
      
      setActiveDebtors(active);
      setInactiveDebtors(inactive);
      setFilteredActiveDebtors(active);
      setFilteredInactiveDebtors(inactive);
      
      // Statistikani hisoblash
      const totalDebtors = updatedData.length;
      const activeDebtorsCount = active.length;
      const inactiveDebtorsCount = inactive.length;
      const totalDebt = active.reduce((sum, d) => sum + (d.debtAmount || 0), 0);
      const averageDebt = activeDebtorsCount > 0 ? totalDebt / activeDebtorsCount : 0;
      const overdueDebtorsCount = active.filter(d => d.isOverdue).length;
      
      setStats({
        totalDebtors,
        activeDebtors: activeDebtorsCount,
        inactiveDebtors: inactiveDebtorsCount,
        totalDebt,
        averageDebt,
        overdueDebtors: overdueDebtorsCount
      });
      
    } catch (err) {
      console.error('❌ Qarzdorlarni yuklashda xatolik:', err);
      setError('Ma\'lumotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // 1 oydan oshgan qarzdorlarni olish
  const getOverdueDebtors = () => {
    return activeDebtors.filter(debtor => 
      debtor.isOverdue && debtor.debtAmount > 0
    );
  };

  // Tarix modal yopilganda
  useEffect(() => {
    if (!showHistoryModal && selectedDebtor) {
      loadDebtors();
      setSelectedDebtor(null);
    }
  }, [showHistoryModal]);

  // Qarzdor qo'shish
  const handleAddDebtor = async (debtorData) => {
    try {
      const res = await debtorAPI.create(debtorData);
      const newDebtor = res.data.data;
      
      // Yangi qarzdorni ro'yxatga qo'shish
      const updatedDebtor = {
        ...newDebtor,
        debtAmount: newDebtor.debtAmount || 0,
        isActive: (newDebtor.debtAmount || 0) > 0,
        status: (newDebtor.debtAmount || 0) > 0 ? 'active' : 'inactive'
      };
      
      if (updatedDebtor.debtAmount > 0) {
        // Faol qarzdorlar ro'yxatiga qo'shish
        setActiveDebtors(prev => [updatedDebtor, ...prev]);
        setFilteredActiveDebtors(prev => [updatedDebtor, ...prev]);
      } else {
        // Nofaol qarzdorlar ro'yxatiga qo'shish
        setInactiveDebtors(prev => [updatedDebtor, ...prev]);
        setFilteredInactiveDebtors(prev => [updatedDebtor, ...prev]);
      }
      
      setShowAddModal(false);
      loadDebtors();
      
    } catch (err) {
      console.error('Qarzdor qo\'shishda xatolik:', err);
      alert(err.response?.data?.message || 'Qarzdor qo\'shishda xatolik yuz berdi');
      throw err;
    }
  };

  // Qarzdor o'chirishni tasdiqlash
  const confirmDeleteDebtor = (debtorId, debtorName, isActive) => {
    setDebtorToDelete({ id: debtorId, name: debtorName, isActive });
    setShowDeleteConfirm(true);
  };

  // Qarzdor o'chirish
  const handleDeleteDebtor = async () => {
    if (!debtorToDelete) return;

    try {
      await debtorAPI.delete(debtorToDelete.id);
      
      if (debtorToDelete.isActive) {
        // Faol qarzdorlardan o'chirish
        setActiveDebtors(prev => prev.filter(debtor => debtor._id !== debtorToDelete.id));
        setFilteredActiveDebtors(prev => prev.filter(debtor => debtor._id !== debtorToDelete.id));
      } else {
        // Nofaol qarzdorlardan o'chirish
        setInactiveDebtors(prev => prev.filter(debtor => debtor._id !== debtorToDelete.id));
        setFilteredInactiveDebtors(prev => prev.filter(debtor => debtor._id !== debtorToDelete.id));
      }
      
      loadDebtors();
      setShowDeleteConfirm(false);
      setDebtorToDelete(null);
      
    } catch (err) {
      console.error('Qarzdor o\'chirishda xatolik:', err);
      alert('Qarzdor o\'chirishda xatolik yuz berdi');
      setShowDeleteConfirm(false);
      setDebtorToDelete(null);
    }
  };

  // Tarix modali ochish
  const handleOpenHistory = (debtor) => {
    setSelectedDebtor(debtor);
    setShowHistoryModal(true);
  };

  // Qidirish
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredActiveDebtors(activeDebtors);
      setFilteredInactiveDebtors(inactiveDebtors);
      return;
    }

    const query = searchQuery.toLowerCase();
    
    const filterDebtors = (debtorList) => {
      return debtorList.filter(debtor =>
        (debtor.name?.toLowerCase().includes(query) ||
        debtor.phone?.includes(query) ||
        debtor.notes?.toLowerCase().includes(query))
      );
    };

    setFilteredActiveDebtors(filterDebtors(activeDebtors));
    setFilteredInactiveDebtors(filterDebtors(inactiveDebtors));
  }, [searchQuery, activeDebtors, inactiveDebtors]);

  // Tab o'zgarishi
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'active') {
      setFilteredActiveDebtors(activeDebtors);
    } else {
      setFilteredInactiveDebtors(inactiveDebtors);
    }
  };

  // Birinchi yuklash
  useEffect(() => {
    loadDebtors();
  }, []);

  // Format number
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('uz-UZ').format(Math.round(num));
  };

  // Sana formatlash
  const formatDate = (dateString) => {
    if (!dateString) return 'Noma\'lum';
    try {
      return new Date(dateString).toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Status rangini olish (faol qarzdorlar uchun)
  const getStatusColor = (debtor) => {
    if (debtor.debtAmount <= 0) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    if (debtor.isOverdue) return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    if (debtor.debtAmount > (debtor.maxDebtAmount || 0)) return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
    return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
  };

  // Status text
  const getStatusText = (debtor) => {
    if (debtor.debtAmount <= 0) return 'To\'langan';
    if (debtor.isOverdue) return `${debtor.overdueDays} kun`;
    return 'Faol';
  };

  // CSV yuklab olish
  const handleDownloadCSV = () => {
    const currentDebtors = activeTab === 'active' ? filteredActiveDebtors : filteredInactiveDebtors;
    
    if (currentDebtors.length === 0) {
      alert('Eksport qilish uchun ma\'lumot yo\'q');
      return;
    }
    
    const headers = ['Ism', 'Telefon', 'Qarz (UZS)', 'Limit (UZS)', 'Holat', 'Sana', 'Izoh'];
    
    const rows = currentDebtors.map(debtor => [
      debtor.name || 'Noma\'lum',
      debtor.phone || 'Noma\'lum',
      debtor.debtAmount || 0,
      debtor.maxDebtAmount || 0,
      activeTab === 'active' ? getStatusText(debtor) : 'To\'langan',
      formatDate(debtor.createdAt),
      debtor.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `qarzdorlar_${activeTab === 'active' ? 'faol' : 'nofaol'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1 oydan oshgan qarzdorlar modali
  const OverdueDebtorsModal = () => {
    const overdueDebtors = getOverdueDebtors();
    
    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={() => setShowOverdueModal(false)}
        />
        
        {/* Modal - pastki qismda */}
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slideUp"
          style={{ maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-3xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <FiAlertTriangle className="text-red-500" size={24} />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    O'tgan qarzdorlar
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {overdueDebtors.length} ta qarzdor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOverdueModal(false)}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <FiX className="text-gray-500 dark:text-gray-400" size={20} />
              </button>
            </div>
            
            {/* Umumiy statistikalar */}
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                    Jami qarz
                  </div>
                  <div className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
                    {formatNumber(overdueDebtors.reduce((sum, d) => sum + d.debtAmount, 0))} UZS
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    O'rtacha kunlar
                  </div>
                  <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {overdueDebtors.length > 0 
                      ? Math.round(overdueDebtors.reduce((sum, d) => sum + d.overdueDays, 0) / overdueDebtors.length)
                      : 0} kun
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-3 sm:p-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {overdueDebtors.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <FiCheckCircle className="mx-auto mb-3 sm:mb-4 text-green-500" size={36} />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">
                  1 oydan oshgan qarzdorlar yo'q
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Barcha qarzdorlar o'z vaqtida to'lov qilmoqda
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {overdueDebtors.map((debtor, index) => (
                  <div 
                    key={debtor._id}
                    className="bg-red-50/50 dark:bg-red-900/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-red-200 dark:border-red-800"
                  >
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div className="flex-1 mr-2">
                        <div className="flex items-start gap-2 sm:gap-3 mb-1">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md sm:rounded-lg font-bold text-xs sm:text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                              {debtor.name || 'Noma\'lum'}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {debtor.phone || 'Telefon yo\'q'}
                            </p>
                          </div>
                        </div>
                        
                        {debtor.notes && (
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 line-clamp-2">
                            {debtor.notes}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm mt-1">
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <FiClock size={12} />
                            <span>{debtor.overdueDays} kun</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <FiCalendar size={12} />
                            <span className="hidden sm:inline">Oxirgi: </span>
                            {formatDate(debtor.updatedAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-base sm:text-xl font-bold text-red-600 dark:text-red-400 mb-1">
                          {formatNumber(debtor.debtAmount)}
                        </div>
                        {debtor.maxDebtAmount > 0 && (
                          <div className="text-xs text-gray-500">
                            Limit: {formatNumber(debtor.maxDebtAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-red-200 dark:border-red-800">
                      <button
                        onClick={() => {
                          setSelectedDebtor(debtor);
                          setShowOverdueModal(false);
                          setTimeout(() => setShowHistoryModal(true), 100);
                        }}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2"
                      >
                        <FiEye size={12} />
                        <span>Tarix</span>
                      </button>
                      
                      <button
                        onClick={() => confirmDeleteDebtor(debtor._id, debtor.name, true)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2"
                      >
                        <FiTrash2 size={12} />
                        <span>O'chirish</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Qo'shimcha harakatlar */}
            {overdueDebtors.length > 0 && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      const phoneNumbers = overdueDebtors
                        .filter(d => d.phone)
                        .map(d => d.phone)
                        .join(', ');
                      
                      if (phoneNumbers) {
                        alert(`Xabar yuborish uchun telefon raqamlar:\n${phoneNumbers}`);
                      } else {
                        alert('Telefon raqamlar topilmadi');
                      }
                    }}
                    className="py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-xs sm:text-sm transition-colors"
                  >
                    Xabar yuborish
                  </button>
                  
                  <button
                    onClick={() => {
                      const totalDebt = overdueDebtors.reduce((sum, d) => sum + d.debtAmount, 0);
                      alert(`1 oydan oshgan qarzdorlar jami qarzi: ${formatNumber(totalDebt)} UZS\nMiqdori: ${overdueDebtors.length} ta`);
                    }}
                    className="py-2 sm:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-xs sm:text-sm transition-colors"
                  >
                    Hisobot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // O'chirish tasdiqlash modali
  const DeleteConfirmModal = () => {
    if (!debtorToDelete) return null;
    
    return (
      <>
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={() => setShowDeleteConfirm(false)}
        />
        
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <FiAlertTriangle className="text-red-600 dark:text-red-400" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Qarzdorni o'chirish
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              <span className="font-semibold">{debtorToDelete.name}</span> ismli qarzdorni ro'yxatdan o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDeleteDebtor}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FiTrash2 size={16} />
                O'chirish
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Jadval kontenti render qilish
  const renderTableContent = () => {
    const currentDebtors = activeTab === 'active' ? filteredActiveDebtors : filteredInactiveDebtors;
    const isActiveTab = activeTab === 'active';

    if (loading) {
      return (
        <tr>
          <td colSpan="6" className="text-center py-8 sm:py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-blue-500 mb-3 sm:mb-4"></div>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">Ma'lumotlar yuklanmoqda...</p>
            </div>
          </td>
        </tr>
      );
    }

    if (currentDebtors.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="text-center py-8 sm:py-12">
            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
              {isActiveTab ? (
                <>
                  <FiCheckCircle className="mx-auto mb-3 sm:mb-4" size={36} />
                  <p className="text-base sm:text-lg font-medium">Faol qarzdorlar yo'q</p>
                  <p className="text-xs sm:text-sm mt-1">Barcha qarzdorlar qarzlarini to'lagan</p>
                </>
              ) : (
                <>
                  <FiUsers className="mx-auto mb-3 sm:mb-4" size={36} />
                  <p className="text-base sm:text-lg font-medium">Nofaol qarzdorlar yo'q</p>
                  <p className="text-xs sm:text-sm mt-1">Barcha qarzdorlar qarzdor</p>
                </>
              )}
            </div>
          </td>
        </tr>
      );
    }

    return currentDebtors.map((debtor, index) => (
      <tr 
        key={debtor._id}
        className={`border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
          debtor.isOverdue && isActiveTab ? 'bg-red-50/50 dark:bg-red-900/10' : ''
        }`}
      >
        <td className="py-3 px-4 sm:px-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-sm sm:text-base">
            {index + 1}
          </div>
        </td>
        <td className="py-3 px-4 sm:px-6">
          <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
            {debtor.name || 'Noma\'lum'}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {debtor.notes || 'Izoh yo\'q'}
          </div>
        </td>
        <td className="py-3 px-4 sm:px-6">
          <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
            {debtor.phone || 'Noma\'lum'}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatDate(debtor.createdAt)}
          </div>
        </td>
        <td className="py-3 px-4 sm:px-6">
          <div className="flex flex-col gap-1 sm:gap-2">
            <div className={`inline-flex items-center px-3 py-1 sm:px-4 sm:py-2 rounded-xl font-bold text-sm sm:text-base ${
              isActiveTab 
                ? debtor.isOverdue 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400'
            }`}>
              {formatNumber(debtor.debtAmount)} UZS
            </div>
            {debtor.maxDebtAmount > 0 && (
              <div className="text-xs text-gray-500">
                Limit: {formatNumber(debtor.maxDebtAmount)} UZS
              </div>
            )}
            {debtor.isOverdue && isActiveTab && (
              <div className="text-xs text-red-500 font-medium">
                ⚠️ {debtor.overdueDays} kun
              </div>
            )}
          </div>
        </td>
        <td className="py-3 px-4 sm:px-6">
          {isActiveTab ? (
            <div className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm ${getStatusColor(debtor)}`}>
              {debtor.debtAmount <= 0 ? (
                <FiCheckCircle className="mr-1" size={12} />
              ) : (
                <FiAlertCircle className="mr-1" size={12} />
              )}
              {getStatusText(debtor)}
            </div>
          ) : (
            <div className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30">
              <FiCheckCircle className="mr-1" size={12} />
              To'langan
            </div>
          )}
        </td>
        <td className="py-3 px-4 sm:px-6">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleOpenHistory(debtor)}
              className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              title="Tarix"
            >
              <FiEye size={14} />
            </button>
            <button
              onClick={() => confirmDeleteDebtor(debtor._id, debtor.name, isActiveTab)}
              className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              title="O'chirish"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  // Mobil uchun kontent render qilish
  const renderMobileContent = () => {
    const currentDebtors = activeTab === 'active' ? filteredActiveDebtors : filteredInactiveDebtors;
    const isActiveTab = activeTab === 'active';

    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3 mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ma'lumotlar yuklanmoqda...</p>
        </div>
      );
    }

    if (currentDebtors.length === 0) {
      return (
        <div className="text-center py-8">
          {isActiveTab ? (
            <>
              <FiCheckCircle className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={32} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Faol qarzdorlar yo'q</p>
            </>
          ) : (
            <>
              <FiUsers className="mx-auto mb-3 text-gray-400 dark:text-gray-600" size={32} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Nofaol qarzdorlar yo'q</p>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-y-auto max-h-[calc(100vh-400px)]">
        {currentDebtors.map((debtor, index) => (
          <div 
            key={debtor._id}
            className={`border-b border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
              debtor.isOverdue && isActiveTab ? 'bg-red-50/30 dark:bg-red-900/10' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white">{debtor.name || 'Noma\'lum'}</div>
                  <div className="text-xs text-gray-500">{debtor.phone || 'Noma\'lum'}</div>
                </div>
              </div>
              {isActiveTab ? (
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getStatusColor(debtor)}`}>
                  {getStatusText(debtor)}
                </div>
              ) : (
                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30">
                  To'langan
                </div>
              )}
            </div>
            
            <div className="mb-2">
              <div className="text-xs text-gray-500 mb-0.5">Izoh</div>
              <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">
                {debtor.notes || 'Izoh yo\'q'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <div className="text-xs text-gray-500">Qarz summasi</div>
                <div className={`font-bold text-sm ${
                  isActiveTab 
                    ? debtor.isOverdue 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {formatNumber(debtor.debtAmount)} UZS
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Sana</div>
                <div className="font-medium text-xs text-gray-700 dark:text-gray-300">
                  {formatDate(debtor.createdAt)}
                </div>
              </div>
            </div>
            
            {debtor.maxDebtAmount > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-500">Qarz limiti</div>
                <div className="font-medium text-xs text-gray-700 dark:text-gray-300">
                  {formatNumber(debtor.maxDebtAmount)} UZS
                </div>
              </div>
            )}
            
            {debtor.isOverdue && isActiveTab && (
              <div className="mb-2 p-1.5 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ {debtor.overdueDays} kun o'tgan
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenHistory(debtor)}
                  className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"
                  title="Tarix"
                >
                  <FiEye size={14} />
                </button>
                <button
                  onClick={() => confirmDeleteDebtor(debtor._id, debtor.name, isActiveTab)}
                  className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
                  title="O'chirish"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
              <button
                onClick={() => handleOpenHistory(debtor)}
                className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1"
              >
                <span>Batafsil</span>
                <FiChevronRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-3 sm:px-4 pt-4 sm:pt-6 pb-3 sm:pb-4">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Qarzdorlar Boshqaruvi
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Faol: {stats.activeDebtors} ta | Nofaol: {stats.inactiveDebtors} ta | Jami qarz: {formatNumber(stats.totalDebt)} UZS
            </p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FiUserPlus size={16} />
              <span className="text-sm sm:text-base">Yangi Qarzdor</span>
            </button>
            
            <button
              onClick={loadDebtors}
              disabled={loading}
              className="p-2 sm:p-2.5 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all duration-300 disabled:opacity-50"
              title="Yangilash"
            >
              <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Xato xabari */}
      {error && (
        <div className="px-3 sm:px-4 mb-3 sm:mb-4">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm sm:text-base">{error}</span>
            <button
              onClick={loadDebtors}
              className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 text-sm font-medium"
            >
              Qayta urinish
            </button>
          </div>
        </div>
      )}

      {/* Statistikalar - mobil uchun slider */}
      <div className="px-3 sm:px-4 mb-4 sm:mb-6">
        <div className="md:hidden overflow-x-auto pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4">
          <div className="flex gap-3 min-w-max">
            {[
              {
                label: 'Jami qarzdorlar',
                value: `${stats.totalDebtors} ta`,
                icon: FiUsers,
                color: 'blue'
              },
              {
                label: 'Faol qarzdorlar',
                value: `${stats.activeDebtors} ta`,
                icon: FiTrendingUp,
                color: 'emerald'
              },
              {
                label: 'Nofaol qarzdorlar',
                value: `${stats.inactiveDebtors} ta`,
                icon: FiTrendingDown,
                color: 'green'
              },
              {
                label: 'O\'tgan qarzdorlar',
                value: `${stats.overdueDebtors} ta`,
                icon: FiAlertTriangle,
                color: 'red'
              },
              {
                label: 'Jami qarz',
                value: `${formatNumber(stats.totalDebt)}`,
                icon: FiDollarSign,
                color: 'purple'
              }
            ].map((stat, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 min-w-35"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-lg`}>
                    <stat.icon className={`text-${stat.color}-600 dark:text-${stat.color}-400`} size={16} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</div>
                    <div className={`text-base font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>
                      {stat.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop statistikalar */}
        <div className="hidden md:grid grid-cols-5 gap-3 sm:gap-4">
          {[
            { label: 'Jami qarzdorlar', value: `${stats.totalDebtors} ta`, icon: FiUsers, color: 'blue' },
            { label: 'Faol qarzdorlar', value: `${stats.activeDebtors} ta`, icon: FiTrendingUp, color: 'emerald' },
            { label: 'Nofaol qarzdorlar', value: `${stats.inactiveDebtors} ta`, icon: FiTrendingDown, color: 'green' },
            { label: 'O\'tgan qarzdorlar', value: `${stats.overdueDebtors} ta`, icon: FiAlertTriangle, color: 'red' },
            { label: 'Jami qarz', value: `${formatNumber(stats.totalDebt)}`, icon: FiDollarSign, color: 'purple' }
          ].map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`p-1.5 sm:p-2 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-lg`}>
                  <stat.icon className={`text-${stat.color}-600 dark:text-${stat.color}-400`} size={18} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                  <div className={`text-lg sm:text-xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtrlash va qidirish */}
      <div className="px-3 sm:px-4 mb-3 sm:mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <FiSearch className="text-gray-400" size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm sm:text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ism, telefon bo'yicha qidirish..."
              />
            </div>
            
            {/* 1 oydan o'tgan qarzdorlar */}
            <button
              onClick={() => setShowOverdueModal(true)}
              disabled={getOverdueDebtors().length === 0}
              className={`w-full py-2.5 sm:py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm sm:text-base ${
                getOverdueDebtors().length > 0
                  ? 'bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <FiAlertTriangle size={16} />
              <span>O'tgan qarzdorlar ({getOverdueDebtors().length})</span>
            </button>

            {/* Tab tugmalari */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTabChange('active')}
                className={`py-2.5 sm:py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm sm:text-base ${
                  activeTab === 'active'
                    ? 'bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <FiTrendingUp size={16} />
                <span>Faol ({filteredActiveDebtors.length})</span>
              </button>
              
              <button
                onClick={() => handleTabChange('inactive')}
                className={`py-2.5 sm:py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm sm:text-base ${
                  activeTab === 'inactive'
                    ? 'bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <FiTrendingDown size={16} />
                <span>Nofaol ({filteredInactiveDebtors.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Asosiy jadval */}
      <div className="px-3 sm:px-4 pb-4 sm:pb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Tab nomi */}
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {activeTab === 'active' ? 'Faol Qarzdorlar' : 'Nofaol Qarzdorlar'}
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {activeTab === 'active' ? filteredActiveDebtors.length : filteredInactiveDebtors.length} ta
              </span>
            </h2>
          </div>
          
          {/* Desktop jadvali */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left py-3 px-4 sm:px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    T/R
                  </th>
                  <th className="text-left py-3 px-4 sm:px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    Ism va Familyasi
                  </th>
                  <th className="text-left py-3 px-4 sm:px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    Telefon raqami
                  </th>
                  <th className="text-left py-3 px-4 sm:px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    Jami qarzi
                  </th>
                  <th className="text-left py-3 px-4 sm:px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    Holati
                  </th>
                  <th className="text-left py-3 px-4 sm:px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                    Harakatlar
                  </th>
                </tr>
              </thead>
              <tbody>
                {renderTableContent()}
              </tbody>
            </table>
          </div>

          {/* Mobil jadval */}
          <div className="md:hidden">
            {renderMobileContent()}
          </div>
        </div>
      </div>

      {/* Qarzdor qo'shish modali */}
      <AddDebtor
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddDebtor={handleAddDebtor}
        loading={loading}
      />

      {/* Tarix modali */}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        debtor={selectedDebtor}
        onPayDebt={() => {
          loadDebtors();
          alert("To'lov amalga oshirildi. Qarzdor nofaol ro'yxatga o'tkazildi.");
        }}
        onRemoveDebt={() => {
          loadDebtors();
          alert("Qarz o'chirildi. Qarzdor nofaol ro'yxatga o'tkazildi.");
        }}
      />

      {/* 1 oydan oshgan qarzdorlar modali */}
      {showOverdueModal && <OverdueDebtorsModal />}

      {/* O'chirish tasdiqlash modali */}
      {showDeleteConfirm && <DeleteConfirmModal />}
    </div>
  );
};

export default Hisob;