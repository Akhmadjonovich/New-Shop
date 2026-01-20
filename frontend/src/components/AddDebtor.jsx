import { useState, useEffect } from 'react';
import { FiX, FiUser, FiPhone, FiCheck, FiAlertCircle } from 'react-icons/fi';

const AddDebtor = ({ isOpen, onClose, onAddDebtor, loading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  
  const [phoneError, setPhoneError] = useState('');
  const [phoneLength, setPhoneLength] = useState(0);

  // Telefon operator kodlari
  const operatorCodes = ['90', '91', '93', '94', '95', '96', '97', '98', '99', '33', '50', '55', '77', '88'];

  // Telefon raqamini formatlash
  const formatPhoneNumber = (value) => {
    // Faqat raqamlar
    let phone = value.replace(/\D/g, '');
    
    // Davlat kodi
    if (phone.startsWith('998')) {
      phone = phone.substring(3);
    }
    
    // Operator kodini tekshirish
    if (phone.length >= 2) {
      const operatorCode = phone.substring(0, 2);
      if (!operatorCodes.includes(operatorCode)) {
        setPhoneError('Noto\'g\'ri operator kodi');
      } else {
        setPhoneError('');
      }
    }
    
    // Formatlash
    if (phone.length > 9) {
      phone = phone.substring(0, 9);
    }
    
    setPhoneLength(phone.length);
    
    if (phone.length === 0) return '';
    if (phone.length <= 2) return phone;
    if (phone.length <= 5) return `${phone.substring(0, 2)} ${phone.substring(2)}`;
    if (phone.length <= 7) return `${phone.substring(0, 2)} ${phone.substring(2, 5)} ${phone.substring(5)}`;
    return `${phone.substring(0, 2)} ${phone.substring(2, 5)} ${phone.substring(5, 7)} ${phone.substring(7)}`;
  };

  // Telefon o'zgartirilganda
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const formattedPhone = formatPhoneNumber(value);
    setFormData(prev => ({
      ...prev,
      phone: formattedPhone
    }));
  };

  // Qolgan maydonlarni o'zgartirish
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Formani yuborish
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validatsiya
    if (!formData.name.trim()) {
      alert('Ism va familyani kiriting!');
      return;
    }
    
    if (!formData.phone.trim()) {
      alert('Telefon raqamini kiriting!');
      return;
    }
    
    if (phoneError) {
      alert('Telefon raqami noto\'g\'ri!');
      return;
    }
    
    if (phoneLength !== 9) {
      alert('Telefon raqami 9 ta raqamdan iborat bo\'lishi kerak!');
      return;
    }
    
    // To'liq telefon raqamini yaratish
    const cleanPhone = formData.phone.replace(/\s/g, '');
    const fullPhone = `+998${cleanPhone}`;
    
    const debtorData = {
      name: formData.name.trim(),
      phone: fullPhone,
      createdAt: new Date().toISOString(),
    };

    onAddDebtor(debtorData);
    
    // Formani tozalash
    setFormData({
      name: '',
      phone: '',
    });
    setPhoneError('');
    setPhoneLength(0);
  };

  // Modal ochilganda focus
  useEffect(() => {
    if (isOpen) {
      // Kichik ekranda klaviaturani chiqarish uchun biroz kechikish
      setTimeout(() => {
        const input = document.querySelector('input[name="name"]');
        if (input) input.focus();
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slideUp max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-3xl shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FiUser className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Qarzdor qo'shish
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Yangi qarzdor ma'lumotlarini kiriting
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
            >
              <FiX size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ism va Familya */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ism va Familya <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <FiUser className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Ali Valiyev"
                  required
                  autoComplete="name"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Qarzdorning to'liq ismi va familyasi
              </p>
            </div>

            {/* Telefon raqami */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefon raqami <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  <span className="text-gray-500 font-medium">+998</span>
                  <div className="h-5 w-px bg-gray-300"></div>
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`w-full pl-20 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border ${
                    phoneError ? 'border-red-500' : phoneLength === 9 ? 'border-green-500' : 'border-gray-300 dark:border-gray-700'
                  } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base`}
                  placeholder="90 123 45 67"
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {phoneLength === 9 && !phoneError ? (
                    <FiCheck className="text-green-500" size={18} />
                  ) : phoneError ? (
                    <FiAlertCircle className="text-red-500" size={18} />
                  ) : null}
                </div>
              </div>
              
              {/* Telefon raqami tekshiruvi */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex-1">
                  {phoneError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <FiAlertCircle size={12} />
                      {phoneError}
                    </p>
                  )}
                </div>
                <div className={`text-xs font-medium px-2 py-1 rounded ${
                  phoneLength === 9 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  phoneLength > 9 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {phoneLength}/9
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Telefon raqami 9 ta raqamdan iborat bo'lishi kerak
              </p>
            </div>

            {/* Qo'shimcha eslatma */}
            <div className="hidden sm:block">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Qo'shimcha eslatma (ixtiyoriy)
              </label>
              <textarea
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="2"
                placeholder="Qarzdor haqida qo'shimcha ma'lumot..."
              />
            </div>
          </form>
        </div>

        {/* Footer - Tugmalar */}
        <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300 font-medium text-base"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Kutilmoqda...
                </>
              ) : (
                <>
                  <FiUser size={20} />
                  Qarzdor qo'shish
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddDebtor;