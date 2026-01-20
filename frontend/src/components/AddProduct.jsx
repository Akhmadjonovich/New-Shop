import { useState, useEffect, useRef } from 'react';
import { FiX, FiPackage, FiCamera, FiCheck, FiChevronDown, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { productAPI } from '../services/api';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";

// AddScanner komponenti
const AddScanner = ({ onScan, onCloseScanner }) => {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const audioRef = useRef(null);

  // Beep ovozini yaratish
  useEffect(() => {
    if (soundEnabled) {
      try {
        // Audio context yaratish
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioRef.current = audioContext;
        
        return () => {
          if (audioRef.current) {
            audioRef.current.close();
          }
        };
      } catch (err) {
        console.error('Audio context yaratishda xatolik:', err);
        setSoundEnabled(false);
      }
    }
  }, [soundEnabled]);

  // Beep ovozini chalish
  const playBeep = async () => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = audioRef.current;
      
      if (!audioContext) return;
      
      // Audio context ni resume qilish (browser policy uchun)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Oscillator yaratish
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      // Gain control - soft start and end
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      
      // Cleanup
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (err) {
      console.error('Beep ovozini chalishda xatolik:', err);
    }
  };

  // Vibratsiya berish
  const triggerVibration = () => {
    if (!vibrationEnabled || !navigator.vibrate) return;
    
    try {
      // Kuchli vibratsiya (150ms)
      navigator.vibrate(150);
    } catch (err) {
      console.error('Vibratsiya ishlatishda xatolik:', err);
      setVibrationEnabled(false);
    }
  };

  // Scanner boshqaruvi
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
    ]);

    const reader = new BrowserMultiFormatReader(hints, 200);
    readerRef.current = reader;

    const startScan = async () => {
      try {
        const devices = await reader.listVideoInputDevices();

        if (!devices.length) {
          setError("📷 Kamera topilmadi");
          return;
        }

        // Back yoki default kamera
        const backCamera = devices.find((d) => 
          d.label.toLowerCase().includes("back") || 
          d.label.toLowerCase().includes("rear")
        ) || devices[0];

        if (!videoRef.current) return;

        await reader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current,
          (result, err) => {
            if (result) {
              // Beep ovozini chalish
              playBeep();
              
              // Vibratsiya
              triggerVibration();
              
              // Barcode ni yuborish
              onScan(result.getText());
              setScanning(false);
              reader.reset();
              
              // Scanner yopish
              setTimeout(() => {
                onCloseScanner();
              }, 500); // Ovoz va vibratsiya uchun vaqt berish
            }
            if (err && !(err instanceof NotFoundException)) {
              console.error("Scanner xatosi:", err);
            }
          }
        );
      } catch (e) {
        console.error("Kamera xatosi:", e);
        setError(
          e.name === "NotAllowedError"
            ? "🚫 Kameraga ruxsat berilmadi"
            : "📷 Kamera ishlay olmadi"
        );
      }
    };

    if (scanning) startScan();

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, [scanning, onScan, onCloseScanner, soundEnabled, vibrationEnabled]);

  return (
    <div className="relative w-full max-w-400 mx-auto">
      {/* Ovoz va vibratsiya boshqaruv tugmalari */}
      <div className="flex justify-end gap-2 mb-3">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg flex items-center justify-center ${
            soundEnabled 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          } transition-colors`}
          title={soundEnabled ? "Ovoz yoqilgan" : "Ovoz o'chirilgan"}
        >
          {soundEnabled ? <FiVolume2 size={18} /> : <FiVolumeX size={18} />}
        </button>
        
        <button
          onClick={() => setVibrationEnabled(!vibrationEnabled)}
          className={`p-2 rounded-lg flex items-center justify-center ${
            vibrationEnabled 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          } transition-colors`}
          title={vibrationEnabled ? "Vibratsiya yoqilgan" : "Vibratsiya o'chirilgan"}
        >
          <span className="text-xs font-bold">{vibrationEnabled ? "📳" : "📴"}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center mb-3">
          <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setScanning(true);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Qayta urinish
          </button>
        </div>
      )}

      {!error && (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full rounded-2xl border-2 border-gray-800 dark:border-gray-600"
            muted
            autoPlay
            playsInline
          />
          
          {/* Scanner laser chizig'i */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-green-400 to-transparent animate-scan rounded-full" />
          
          {/* Scanner ko'rsatkichlari */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Burchaklar */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-400"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-green-400"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-green-400"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-400"></div>
            
            {/* Markaziy joylashtirish */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-1 bg-linear-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
          </div>
          
          {/* Yordamchi matn */}
          <div className="absolute -bottom-10 left-0 right-0 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Shtrix kodni markazda ushlang
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                {soundEnabled && <FiVolume2 size={10} />}
                {vibrationEnabled && <span className="text-xs">📳</span>}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Asosiy AddProduct komponenti
const AddProduct = ({ onClose, onSuccess, categories }) => {
  const [step, setStep] = useState(1);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    cost: '',
    price: '',
    quantity: '',
    unit: 'dona',
    category: '',
    description: '',
    minStock: '10'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [existingProduct, setExistingProduct] = useState(null);
  const unitDropdownRef = useRef(null);
  const unitButtonRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        unitDropdownRef.current && 
        !unitDropdownRef.current.contains(event.target) &&
        unitButtonRef.current && 
        !unitButtonRef.current.contains(event.target)
      ) {
        setShowUnitDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Skaner tomonidan shtrix kodi olish
  const handleBarcodeScanned = async (barcode) => {
    // Skaner ovoz va vibratsiyasidan keyin ma'lumotlarni yuklash
    setScannedBarcode(barcode);
    setFormData(prev => ({ ...prev, barcode }));
    
    // Qisqa kutish (ovoz va vibratsiya uchun)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Skanerdan kelgan kod bo'yicha serverdan ma'lumot olish
    await fetchProductByBarcode(barcode);
    
    // Keyingi bosqichga o'tish
    setStep(2);
  };

  // Scanner yopish
  const handleCloseScanner = () => {
    setStep(2);
  };

  const fetchProductByBarcode = async (barcode) => {
    try {
      const response = await productAPI.getByBarcode(barcode);
      
      if (response.data.success && response.data.exists) {
        // Product mavjud
        const product = response.data.data;
        setExistingProduct(product);
        setFormData({
          barcode: product.barcode || barcode,
          name: product.name || '',
          cost: product.cost?.toString() || '',
          price: product.price?.toString() || '',
          quantity: product.quantity?.toString() || '',
          unit: product.unit || 'dona',
          category: product.category?._id || product.category || '',
          description: product.description || '',
          minStock: product.minStock?.toString() || '10'
        });
        setError('Bu mahsulot allaqachon mavjud. Ma\'lumotlar yuklandi.');
      } else {
        // Product mavjud emas, faqat barcode ni o'rnatish
        setFormData(prev => ({ 
          ...prev, 
          barcode: barcode,
          name: '',
          cost: '',
          price: '',
          quantity: '',
          unit: 'dona',
          category: '',
          description: '',
          minStock: '10'
        }));
        setExistingProduct(null);
        setError('');
      }
    } catch (err) {
      console.error('Barcode fetch error:', err);
      // Agar 404 bo'lsa yoki product mavjud emas bo'lsa
      if (err.response?.status === 404 || err.response?.data?.exists === false) {
        setFormData(prev => ({ 
          ...prev, 
          barcode: barcode,
          name: '',
          cost: '',
          price: '',
          quantity: '',
          unit: 'dona',
          category: '',
          description: '',
          minStock: '10'
        }));
        setExistingProduct(null);
        setError('');
      } else {
        setError('Barcode tekshirishda xatolik: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validatsiya
    if (!formData.name.trim()) {
      setError('Mahsulot nomini kiriting');
      setLoading(false);
      return;
    }
    if (!formData.category) {
      setError('Kategoriyani tanlang');
      setLoading(false);
      return;
    }
    if (!formData.cost || Number(formData.cost) <= 0) {
      setError('Asl narxni to\'g\'ri kiriting');
      setLoading(false);
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      setError('Sotish narxni to\'g\'ri kiriting');
      setLoading(false);
      return;
    }
    if (!formData.quantity || Number(formData.quantity) < 0) {
      setError('Miqdorni to\'g\'ri kiriting');
      setLoading(false);
      return;
    }

    try {
      let response;
      
      if (existingProduct && existingProduct._id) {
        // Update existing product
        response = await productAPI.update(existingProduct._id, {
          name: formData.name,
          barcode: formData.barcode,
          category: formData.category,
          cost: Number(formData.cost),
          price: Number(formData.price),
          quantity: Number(formData.quantity),
          unit: formData.unit,
          description: formData.description,
          minStock: Number(formData.minStock)
        });
      } else {
        // Create new product
        response = await productAPI.create({
          name: formData.name,
          barcode: formData.barcode,
          category: formData.category,
          cost: Number(formData.cost),
          price: Number(formData.price),
          quantity: Number(formData.quantity),
          unit: formData.unit,
          description: formData.description,
          minStock: Number(formData.minStock)
        });
      }
      
      if (response.data.success) {
        // Muvaffaqiyatli saqlashda vibratsiya
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]); // Qisqa vibratsiya
        }
        onSuccess();
        onClose();
      } else {
        setError(response.data.message || 'Xatolik yuz berdi');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.message || 'Server xatosi. Iltimos, qayta urinib ko\'ring.');
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

  const handleUnitChange = (unit) => {
    setFormData(prev => ({ ...prev, unit }));
    setShowUnitDropdown(false);
  };

  const handleManualBarcode = () => {
    const barcode = prompt('Barcode ni kiriting:');
    if (barcode) {
      // Manual kiritishda ovoz chiqarish
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      handleBarcodeScanned(barcode);
    }
  };

  // O'lchov birliklari
  const units = [
    { value: 'dona', label: 'Dona', icon: '📦' },
    { value: 'kg', label: 'Kilogramm', icon: '⚖️' },
    { value: 'gr', label: 'Gramm', icon: '⚖️' },
    { value: 'litr', label: 'Litr', icon: '💧' },
    { value: 'metr', label: 'Metr', icon: '📏' },
    { value: 'paket', label: 'Paket', icon: '📦' },
    { value: 'quti', label: 'Quti', icon: '📦' },
    { value: 'shisha', label: 'Shisha', icon: '🍾' },
    { value: 'karton', label: 'Karton', icon: '📦' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-2">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 animate-slideUp sm:animate-scaleIn max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FiPackage className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {step === 1 ? 'Shtrix Kod Skaneri' : 'Mahsulot Qo\'shish'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {step === 1 ? 'Kamerani barcode ga qarating' : 'Mahsulot ma\'lumotlarini to\'ldiring'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FiX size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {existingProduct && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <span>Bu mahsulot allaqachon mavjud. Ma'lumotlarni yangilash yoki yangi mahsulot sifatida kiritishingiz mumkin.</span>
              </p>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              {/* Manual barcode button */}
              <div className="text-center">
                <button
                  onClick={handleManualBarcode}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-300 text-sm w-full flex items-center justify-center gap-2"
                >
                  <span className="text-base">📝</span>
                  Barcode ni qo'lda kiriting
                </button>
              </div>

              {/* Scanner component */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3">
                <AddScanner 
                  onScan={handleBarcodeScanned} 
                  onCloseScanner={handleCloseScanner}
                />
              </div>

              {/* Current barcode display */}
              {scannedBarcode && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 dark:text-green-400 mb-1">Skanerlangan:</p>
                      <p className="text-sm font-mono font-bold text-green-700 dark:text-green-300">{scannedBarcode}</p>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm"
                    >
                      <FiCheck size={16} />
                      Davom etish
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Barcode display */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Shtrix kod</p>
                    <p className="text-sm font-mono font-bold text-blue-700 dark:text-blue-300 truncate">{formData.barcode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="ml-3 p-2.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Qayta skaner qilish"
                  >
                    <FiCamera size={18} />
                  </button>
                </div>
              </div>

              {/* Product name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mahsulot nomi *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white transition-all duration-300 text-sm"
                  placeholder="Coca-Cola 1.5L"
                  autoFocus
                />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Asl narxi *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="cost"
                      value={formData.cost}
                      onChange={handleChange}
                      required
                      min="0"
                      step="100"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white transition-all duration-300 text-sm"
                      placeholder="15000"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                      so'm
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sotish narxi *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      min="0"
                      step="100"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white transition-all duration-300 text-sm"
                      placeholder="18000"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                      so'm
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity with unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Miqdori *
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white transition-all duration-300 text-sm"
                      placeholder="10"
                    />
                  </div>
                  <div className="relative">
                    <button
                      ref={unitButtonRef}
                      type="button"
                      onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                      className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm min-w-24"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">
                          {units.find(u => u.value === formData.unit)?.icon}
                        </span>
                        <span>{units.find(u => u.value === formData.unit)?.label}</span>
                      </span>
                      <FiChevronDown size={14} className={`transition-transform ${showUnitDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showUnitDropdown && (
                      <div 
                        ref={unitDropdownRef}
                        className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:top-full sm:mt-1 sm:right-0 sm:w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-t-2xl sm:rounded-xl shadow-xl z-50 animate-slideUp sm:animate-fadeIn max-h-60 overflow-y-auto"
                      >
                        <div className="p-2">
                          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 mb-1">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">O'lchov birligi</h3>
                          </div>
                          {units.map((unit) => (
                            <button
                              key={unit.value}
                              type="button"
                              onClick={() => handleUnitChange(unit.value)}
                              className="w-full px-3 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-base">{unit.icon}</span>
                                <span>{unit.label}</span>
                              </div>
                              {formData.unit === unit.value && (
                                <FiCheck className="text-blue-600 dark:text-blue-400" size={16} />
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 sm:hidden">
                          <button
                            type="button"
                            onClick={() => setShowUnitDropdown(false)}
                            className="w-full px-3 py-3 text-center text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg"
                          >
                            Yopish
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategoriya *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white transition-all duration-300 text-sm appearance-none"
                >
                  <option value="">Kategoriyani tanlang</option>
                  {categories.map((category) => (
                    <option key={category._id || category.id} value={category._id || category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Izoh
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent text-gray-900 dark:text-white transition-all duration-300 text-sm resize-none"
                  placeholder="Qo'shimcha ma'lumotlar..."
                />
              </div>

              {/* Footer buttons */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300 font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <span>←</span>
                    Orqaga
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Saqlash...
                      </>
                    ) : (
                      <>
                        <FiCheck size={16} />
                        {existingProduct ? 'Yangilash' : 'Saqlash'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style jsx="true">{`
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AddProduct;