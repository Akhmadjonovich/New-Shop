import { useEffect, useRef, useState } from "react";
import { 
  FiCamera, 
  FiX, 
  FiCheck, 
  FiHash, 
  FiPackage, 
  FiDollarSign, 
  FiShoppingBag, 
  FiTag, 
  FiRefreshCw,
  FiShoppingCart,
  FiArrowRight
} from 'react-icons/fi';
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";

const ScannerModal = ({ 
  isOpen, 
  onClose, 
  onScan, 
  scannedProduct,
  loading,
  error,
  onAddToCart,
  isAddedToCart
}) => {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [barcode, setBarcode] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  // Scanner sozlamalari
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

  // Scanner boshlash
  const startScanner = async () => {
    try {
      const reader = new BrowserMultiFormatReader(hints, 200);
      readerRef.current = reader;

      const devices = await reader.listVideoInputDevices();

      if (!devices.length) {
        setCameraError("📷 Kamera topilmadi");
        return;
      }

      // Back kamera yoki default kamera
      const backCamera = devices.find((d) =>
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("rear") ||
        d.label.toLowerCase().includes("environment")
      ) || devices[0];

      if (!videoRef.current) return;

      await reader.decodeFromVideoDevice(
        backCamera.deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const scannedBarcode = result.getText();
            setBarcode(scannedBarcode);
            setScanning(false);
            reader.reset();
            
            // Parent componentga scanned barcode ni yuborish
            if (onScan) {
              onScan(scannedBarcode);
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error("Scanner xatosi:", err);
          }
        }
      );
    } catch (e) {
      console.error("Kamera xatosi:", e);
      setCameraError(
        e.name === "NotAllowedError"
          ? "🚫 Kameraga ruxsat berilmadi"
          : "📷 Kamera ishlay olmadi: " + e.message
      );
    }
  };

  // Scanner to'xtatish
  const stopScanner = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Qayta skanerlash
  const handleRescan = () => {
    setBarcode(null);
    setCameraError(null);
    setScanning(true);
  };

  // Effectlar
  useEffect(() => {
    if (isOpen && scanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, scanning]);

  if (!isOpen) return null;

  return (
    <>
      {/* Orqa fon - salla ko'rinish */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm backdrop-filter z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Scanner modal */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Modal sarlavhasi */}
        <div className="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiCamera className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Skanerlash
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

        {/* Scanner kontenti */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Kamera xatosi */}
          {cameraError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800 mb-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-3">
                <FiX />
                <span className="font-semibold">{cameraError}</span>
              </div>
              <button
                onClick={handleRescan}
                className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Qayta urinish
              </button>
            </div>
          )}

          {/* Scanner viewport */}
          {!barcode && !cameraError && scanning && (
            <div className="relative w-full bg-black rounded-2xl overflow-hidden mb-4" style={{ height: '300px' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                autoPlay
                playsInline
              />
              
              {/* Scanner overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Scanning frame */}
                  <div className="w-64 h-64 border-2 border-blue-500 rounded-lg animate-pulse">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-500 rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-500 rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-500 rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-500 rounded-br"></div>
                  </div>
                  
                  {/* Scanning line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-scan"></div>
                </div>
              </div>

              {/* Scanner ko'rsatmalari */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="inline-block bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                  Shtrix kodni ramkaga qarating
                </div>
              </div>
            </div>
          )}

          {/* Loading holati */}
          {loading && !scannedProduct && (
            <div className="text-center py-8">
              <FiRefreshCw className="mx-auto text-blue-600 dark:text-blue-400 animate-spin mb-4" size={32} />
              <p className="text-gray-600 dark:text-gray-400">
                Mahsulot ma'lumotlari yuklanmoqda...
              </p>
            </div>
          )}

          {/* Skanerlangan mahsulot */}
          {scannedProduct && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <h3 className="font-bold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                <FiCheck />
                Mahsulot topildi
              </h3>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FiHash className="text-gray-500" size={16} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Shtrix kodi:</span>
                  </div>
                  <div className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                    {scannedProduct.barcode}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FiPackage className="text-gray-500" size={16} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Mahsulot:</span>
                  </div>
                  <div className="font-bold text-lg text-gray-900 dark:text-white">
                    {scannedProduct.name}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FiDollarSign className="text-gray-500" size={16} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Narxi:</span>
                  </div>
                  <div className="font-bold text-lg text-green-600 dark:text-green-400">
                    {scannedProduct.price?.toLocaleString()} UZS
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FiShoppingBag className="text-gray-500" size={16} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Qoldiq:</span>
                  </div>
                  <div className={`font-bold text-lg ${
                    scannedProduct.quantity <= 5 
                      ? 'text-red-600 dark:text-red-400' 
                      : scannedProduct.quantity <= 10 
                        ? 'text-yellow-600 dark:text-yellow-400' 
                        : 'text-green-600 dark:text-green-400'
                  }`}>
                    {scannedProduct.quantity} dona
                  </div>
                </div>
                
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <FiTag className="text-gray-500" size={16} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Kategoriya:</span>
                  </div>
                  <div className="font-bold text-lg text-purple-600 dark:text-purple-400">
                    {scannedProduct.category?.name || 'Kategoriya yo\'q'}
                  </div>
                </div>
              </div>

              {/* Savatga qo'shish tugmasi - Yuqori o'ng burchakda */}
              <div className="flex justify-end mt-4">
                <div className="relative">
                  {isAddedToCart ? (
                    <div className="bg-green-100 dark:bg-green-900/30 border-2 border-green-500 text-green-700 dark:text-green-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2 animate-pulse">
                      <FiCheck size={20} />
                      Savatga qo'shildi!
                    </div>
                  ) : (
                    <button
                      onClick={onAddToCart}
                      className="bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <FiShoppingCart size={20} />
                      Savatga qo'shish
                      <FiArrowRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* API xatosi */}
          {error && !cameraError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800 mt-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-3">
                <FiX />
                <span className="font-semibold">{error}</span>
              </div>
              <button
                onClick={handleRescan}
                className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Qayta urinish
              </button>
            </div>
          )}

          {/* Scanner yo'riqnomasi */}
          {!barcode && !cameraError && !loading && !scannedProduct && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                <FiCamera />
                Skanerlash yo'riqnomasi
              </h3>
              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                <li>• Mahsulot shtrix kodini kameraga qarating</li>
                <li>• Yorug'likni yaxshi sozlang</li>
                <li>• Shtrix kod toza va buzuq bo'lmasin</li>
                <li>• Avtomatik ravishda mahsulot aniqlanadi</li>
                <li>• Skaner kamera ruxsatini berishingiz kerak</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ScannerModal;