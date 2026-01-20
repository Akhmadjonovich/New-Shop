import { useState } from 'react';
import { FiX, FiFolderPlus, FiCheck } from 'react-icons/fi';
import { categoryAPI } from '../services/api'; // ✅ categoryAPI ni import qilamiz

const AddCategory = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6', // default blue
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ✅ categoryAPI.create() dan foydalanamiz
      const response = await categoryAPI.create(formData);
      
      if (response.data.success) {
        onSuccess();
      } else {
        setError(response.data.message || 'Xatolik yuz berdi');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server xatosi');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Ranglar paletasi
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Limez
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/10 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 animate-slideUp sm:animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FiFolderPlus className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yangi kategoriya</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Kategoriya ma'lumotlarini kiriting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FiX size={24} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Kategoriya nomi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategoriya nomi *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white transition-all duration-300"
                placeholder="Masalan: Ichimliklar"
              />
            </div>

            {/* Tavsif */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tavsif (ixtiyoriy)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white transition-all duration-300 resize-none"
                placeholder="Kategoriya haqida qisqacha..."
              />
            </div>

            {/* Rang tanlash */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Rang tanlash
              </label>
              <div className="grid grid-cols-8 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`relative w-10 h-10 rounded-lg transition-transform hover:scale-110 ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {formData.color === color && (
                      <FiCheck className="absolute inset-0 m-auto text-white" size={20} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300 font-medium"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name}
                className="flex-1 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saqlanmoqda...
                  </>
                ) : (
                  <>
                    <FiCheck size={20} />
                    Saqlash
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCategory;