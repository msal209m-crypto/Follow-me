import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  ArrowRight,
  Volume2,
  VolumeX,
  Keyboard,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  Clock,
  SwitchCamera,
  ExternalLink,
} from 'lucide-react';
import { Item } from '../types';
import { useApp } from '../context/AppContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  currency: string;
  onItemScanned?: (item: Item | null, rawBarcode: string) => void;
  onAddToCart?: (item: Item) => void;
  onAddNewItemWithBarcode?: (barcode: string) => void;
  mode?: 'LOOKUP' | 'POS'; // LOOKUP: Inspect item and search; POS: High-speed auto-add to sales cart
  title?: string;
  cartCount?: number;
  cartTotal?: number;
}

// High-frequency fast beep using Web Audio API: 1800Hz tone, 100ms duration
const playBarcodeBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime); // 1800Hz as requested

    // Instant attack, clean decay over 100ms
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); // 100ms duration

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // AudioContext might be blocked until user interacts with the page
  }
};

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  items,
  currency,
  onItemScanned,
  onAddToCart,
  onAddNewItemWithBarcode,
  mode = 'LOOKUP',
  title,
  cartCount,
  cartTotal,
}) => {
  const { language, isRTL } = useApp();
  const [scannerError, setScannerError] = useState<{
    message: string;
    isPermissionDenied: boolean;
    isIframeRestriction?: boolean;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [lastFoundItem, setLastFoundItem] = useState<Item | null>(null);
  const [sessionScannedCount, setSessionScannedCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [continuousScan, setContinuousScan] = useState(mode === 'POS');
  const [manualInputCode, setManualInputCode] = useState('');
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Camera devices selection
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);

  // Instant visual feedback states
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [recentAddedItem, setRecentAddedItem] = useState<{
    name: string;
    price: number;
    barcode: string;
  } | null>(null);
  const [isCooldownActive, setIsCooldownActive] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = 'qr-camera-scanner-region';

  // Anti-duplicate & continuous scanning references
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const COOLDOWN_SAME_BARCODE_MS = 1500; // 1.5 seconds cooldown for the same barcode
  const COOLDOWN_MIN_ANY_MS = 500; // 500ms minimum threshold between different barcodes

  const defaultTitle =
    title ||
    (mode === 'POS'
      ? (language === 'ar' ? 'كاشير الباركود السريع (معالجة محلية)' : 'High-Speed POS Barcode Scanner')
      : (language === 'ar' ? 'مسح الباركود عبر الكاميرا' : 'Camera Barcode Scanner'));

  // Core detection logic
  const handleBarcodeDetected = (barcodeValue: any) => {
    const cleanCode = String(barcodeValue ?? '').trim();
    if (!cleanCode) return;

    // 1. Play high-pitch 1800Hz 100ms beep immediately
    if (soundEnabled) {
      playBarcodeBeep();
    }

    // 2. Mobile haptic vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(60);
      } catch {
        // ignore
      }
    }

    // 3. Trigger immediate green laser/box flash
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 450);

    // 4. Activate 1.5s cooldown indicator
    setIsCooldownActive(true);
    setTimeout(() => setIsCooldownActive(false), COOLDOWN_SAME_BARCODE_MS);

    setLastScannedBarcode(cleanCode);
    setSessionScannedCount((prev) => prev + 1);

    // 5. Look up item locally in inventory
    const cleanTarget = cleanCode.toLowerCase();
    const found = items.find((item) => {
      const bCode = String(item?.barcode ?? '').trim().toLowerCase();
      const skuCode = String(item?.sku ?? '').trim().toLowerCase();
      return bCode === cleanTarget || (skuCode !== '' && skuCode === cleanTarget);
    });

    setLastFoundItem(found || null);

    if (found) {
      // If POS mode with onAddToCart, immediately add to cart without stopping camera
      if (mode === 'POS' && onAddToCart && continuousScan) {
        onAddToCart(found);
        setRecentAddedItem({
          name: found.name,
          price: found.salePrice,
          barcode: found.barcode,
        });
        // Clear toast after 2.5 seconds
        setTimeout(() => {
          setRecentAddedItem((curr) => (curr?.barcode === found.barcode ? null : curr));
        }, 2500);
      }

      if (onItemScanned) {
        onItemScanned(found, cleanCode);
      }
    } else {
      setRecentAddedItem(null);
      if (onItemScanned) {
        onItemScanned(null, cleanCode);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualInputCode.trim();
    if (!code) return;
    lastScannedCodeRef.current = code;
    lastScanTimestampRef.current = Date.now();
    handleBarcodeDetected(code);
    setManualInputCode('');
  };

  const handleSwitchCamera = async () => {
    if (availableCameras.length <= 1) return;
    const nextIdx = (activeCameraIndex + 1) % availableCameras.length;
    setActiveCameraIndex(nextIdx);
    setRetryTrigger((prev) => prev + 1);
  };

  // Initialize and start local scanner with optimized lightweight config
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setScannerError(null);
    setLastScannedBarcode(null);
    setLastFoundItem(null);
    setRecentAddedItem(null);
    setSessionScannedCount(0);
    setIsScanning(false);
    lastScannedCodeRef.current = null;
    lastScanTimestampRef.current = 0;

    const startScanner = async () => {
      try {
        // Wait for container element to exist in DOM
        let container = document.getElementById(scannerRegionId);
        let retries = 0;
        while (!container && retries < 10) {
          await new Promise((r) => setTimeout(r, 60));
          container = document.getElementById(scannerRegionId);
          retries++;
        }

        if (!container || !isMounted) {
          if (isMounted) {
            setScannerError({
              message:
                language === 'ar'
                  ? 'جاري إعداد واجهة الكاميرا... يرجى إعادة المحاولة'
                  : 'Preparing camera surface... please retry',
              isPermissionDenied: false,
            });
          }
          return;
        }

        // Ensure any previous instance is thoroughly stopped & cleared
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
            html5QrCodeRef.current.clear();
          } catch {
            // ignore cleanup
          }
          html5QrCodeRef.current = null;
        }

        // Initialize local in-browser scanner
        const qr = new Html5Qrcode(scannerRegionId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF,
          ],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });
        html5QrCodeRef.current = qr;

        // Optimized scan loop config: 15 fps to eliminate lag and freezing
        const scanConfig = {
          fps: 15, // 15 frames per second as requested
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const w = Math.min(300, Math.floor(viewfinderWidth * 0.88));
            const h = Math.min(180, Math.floor(viewfinderHeight * 0.65));
            return { width: Math.max(160, w), height: Math.max(110, h) };
          },
          aspectRatio: 1.333333,
          disableFlip: false,
        };

        const onScanSuccess = (decodedText: string) => {
          if (!isMounted) return;
          const text = String(decodedText ?? '').trim();
          if (!text) return;

          const now = Date.now();
          // Anti-duplicate rule: Prevent reading the same barcode twice within 1.5 seconds (1500ms)
          if (
            text === lastScannedCodeRef.current &&
            now - lastScanTimestampRef.current < COOLDOWN_SAME_BARCODE_MS
          ) {
            return;
          }
          // Prevent rapid jitter for different codes (<500ms)
          if (now - lastScanTimestampRef.current < COOLDOWN_MIN_ANY_MS) {
            return;
          }

          lastScannedCodeRef.current = text;
          lastScanTimestampRef.current = now;

          handleBarcodeDetected(text);
        };

        let started = false;

        // Try using specific camera ID if camera list was previously enumerated
        if (availableCameras.length > 0 && availableCameras[activeCameraIndex]) {
          try {
            await qr.start(
              availableCameras[activeCameraIndex].id,
              scanConfig,
              onScanSuccess,
              () => {}
            );
            started = true;
          } catch (camErr) {
            console.warn('Selected camera ID failed, attempting fallback...', camErr);
          }
        }

        // Attempt 1: Environment (rear) camera with exact 1-key constraint object
        if (!started) {
          try {
            await qr.start(
              { facingMode: 'environment' },
              scanConfig,
              onScanSuccess,
              () => {}
            );
            started = true;
          } catch (envErr: any) {
            console.warn('Environment camera failed, trying user camera...', envErr);
            const isPermDenied =
              envErr?.name === 'NotAllowedError' ||
              String(envErr?.message || '').toLowerCase().includes('permission') ||
              String(envErr?.message || '').toLowerCase().includes('denied');

            if (isPermDenied) {
              throw envErr;
            }
          }
        }

        // Attempt 2: User/front camera with exact 1-key constraint object
        if (!started) {
          try {
            await qr.start(
              { facingMode: 'user' },
              scanConfig,
              onScanSuccess,
              () => {}
            );
            started = true;
          } catch (userErr: any) {
            console.warn('User camera failed, enumerating cameras...', userErr);
            const isPermDenied =
              userErr?.name === 'NotAllowedError' ||
              String(userErr?.message || '').toLowerCase().includes('permission') ||
              String(userErr?.message || '').toLowerCase().includes('denied');

            if (isPermDenied) {
              throw userErr;
            }
          }
        }

        // Attempt 3: Query device camera list and pick first valid device
        if (!started) {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setAvailableCameras(devices);
            const backCam = devices.find((d) =>
              /back|rear|environment|خلف/i.test(d.label || '')
            );
            const chosen = backCam || devices[0];
            await qr.start(chosen.id, scanConfig, onScanSuccess, () => {});
            started = true;
          } else {
            throw new Error('No camera hardware found on this device.');
          }
        }

        // If successfully started, retrieve cameras list for camera switching button
        if (isMounted && started) {
          setIsScanning(true);
          setScannerError(null);

          // Check if flashlight/torch is supported
          try {
            const track = (qr as any).getRunningTrackCapabilities?.();
            if (track && 'torch' in track) {
              setHasTorch(true);
            }
          } catch {
            // Torch check not supported
          }

          // Fetch camera list to enable switcher button if multiple cameras exist
          try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 1) {
              setAvailableCameras(devices);
            }
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsScanning(false);
        const errMsg = String(err?.message || '');
        const errName = String(err?.name || '');
        const isPerm =
          errName === 'NotAllowedError' ||
          errMsg.toLowerCase().includes('permission') ||
          errMsg.toLowerCase().includes('not allowed') ||
          errMsg.toLowerCase().includes('dismissed') ||
          errMsg.toLowerCase().includes('denied');

        const isIframe = window.self !== window.top;

        let userMsg = '';
        if (isPerm) {
          userMsg =
            language === 'ar'
              ? 'تم رفض إذن الكاميرا. يرجى النقر على أيقونة القفل أو الكاميرا في شريط عنوان المتصفح واختيار "سماح (Allow)".'
              : 'Camera permission denied. Please click the lock or camera icon in your browser address bar and allow camera access.';
        } else if (errName === 'NotFoundError' || errMsg.includes('found') || errMsg.includes('hardware')) {
          userMsg =
            language === 'ar'
              ? 'لم يتم العثور على كاميرا متصلة بالجهاز. يمكنك كتابة الباركود يدوياً بالأسفل.'
              : 'No camera hardware found on this device. You can type barcode manually below.';
        } else {
          userMsg =
            language === 'ar'
              ? 'تعذر تشغيل الكاميرا في نافذة المعاينة الحالية. يرجى التأكد من صلاحيات الكاميرا أو فتح التطبيق في نافذة مستقلة.'
              : 'Could not access camera in current window. Please check permissions or open in a separate tab.';
        }

        setScannerError({
          message: userMsg,
          isPermissionDenied: isPerm,
          isIframeRestriction: isIframe,
        });
      }
    };

    // Fast launch with short delay to ensure DOM element is ready
    const timeout = setTimeout(startScanner, 120);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
          html5QrCodeRef.current.clear();
        } catch {
          // ignore
        }
        html5QrCodeRef.current = null;
      }
    };
  }, [isOpen, retryTrigger, activeCameraIndex, language]);

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.warn('Torch toggle not supported', err);
    }
  };

  const handleOpenInNewTab = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
      >
        {/* Header with status badges */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {defaultTitle}
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>15 FPS • 1800Hz Beep</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {language === 'ar'
                  ? 'معالجة محلية داخل المتصفح 100% بدون تعليق • مسح مستمر وسريع'
                  : '100% In-browser local processing • Ultra-fast continuous scan'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Switch Camera if multiple cameras detected */}
            {availableCameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-2 rounded-lg border bg-slate-800 text-cyan-300 border-slate-700 hover:bg-slate-700 transition-colors cursor-pointer"
                title={language === 'ar' ? 'تبديل الكاميرا (أمامية/خلفية)' : 'Switch Camera'}
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            {/* Beep Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 text-emerald-400 border-slate-700'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
              title={
                soundEnabled
                  ? (language === 'ar' ? 'صوت التنبيه 1800Hz مفعّل' : '1800Hz Beep Enabled')
                  : (language === 'ar' ? 'صوت التنبيه صامت' : 'Sound Muted')
              }
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Flashlight Torch Toggle */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  torchOn
                    ? 'bg-amber-950 text-amber-300 border-amber-600'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title={
                  torchOn
                    ? (language === 'ar' ? 'إطفاء الكشاف' : 'Torch OFF')
                    : (language === 'ar' ? 'تشغيل الكشاف' : 'Torch ON')
                }
              >
                {torchOn ? <Zap className="w-4 h-4 fill-amber-400" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scanner Viewport Area */}
        <div className="relative bg-black flex-1 flex flex-col items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[300px]">
          {/* HTML5 QR Code DOM Region */}
          <div
            id={scannerRegionId}
            className="w-full max-w-[380px] overflow-hidden flex items-center justify-center [&_video]:rounded-xl [&_video]:object-cover [&_video]:w-full"
            style={{ minHeight: '250px' }}
          />

          {/* Scanner Target Guide Overlay & Laser Animation */}
          {isScanning && !scannerError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
              <div
                className={`relative w-64 h-38 sm:w-72 sm:h-42 border-2 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  flashSuccess
                    ? 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_35px_rgba(16,185,129,0.7)] scale-105'
                    : 'border-dashed border-cyan-400/80 bg-cyan-950/10 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                }`}
              >
                {/* Corner Accents */}
                <div
                  className={`absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 rounded-tl-lg transition-colors ${
                    flashSuccess ? 'border-emerald-300' : 'border-cyan-400'
                  }`}
                />
                <div
                  className={`absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 rounded-tr-lg transition-colors ${
                    flashSuccess ? 'border-emerald-300' : 'border-cyan-400'
                  }`}
                />
                <div
                  className={`absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 rounded-bl-lg transition-colors ${
                    flashSuccess ? 'border-emerald-300' : 'border-cyan-400'
                  }`}
                />
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 rounded-br-lg transition-colors ${
                    flashSuccess ? 'border-emerald-300' : 'border-cyan-400'
                  }`}
                />

                {/* Sweeping Laser Line */}
                <div
                  className={`w-full h-0.5 transition-all shadow-[0_0_12px] ${
                    flashSuccess
                      ? 'bg-emerald-300 shadow-emerald-400'
                      : 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-cyan-400'
                  }`}
                />
              </div>

              {/* Status Pill beneath Target */}
              <div className="mt-2.5 flex items-center gap-2">
                {isCooldownActive ? (
                  <span className="text-[11px] text-amber-300 bg-slate-950/90 px-3 py-1 rounded-full border border-amber-500/50 font-medium flex items-center gap-1.5 shadow-md">
                    <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                    <span>
                      {language === 'ar'
                        ? 'مهلة 1.5 ثانية لمنع التكرار (جاهز للصنف التالي)'
                        : '1.5s Anti-duplicate active (Ready for next)'}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11px] text-cyan-200 bg-slate-950/85 px-3 py-1 rounded-full border border-cyan-800/60 font-mono shadow-md">
                    {language === 'ar' ? 'ضع الباركود داخل الإطار للمسح الفوري' : 'Align barcode in frame'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Instant Floating Success Banner in POS Mode */}
          {recentAddedItem && (
            <div className="absolute top-3 inset-x-3 z-20 pointer-events-none flex justify-center animate-in fade-in slide-in-from-top duration-200">
              <div className="bg-emerald-950/95 border border-emerald-500 text-white rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-2.5 max-w-sm">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                  +1
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{recentAddedItem.name}</div>
                  <div className="text-[10px] text-emerald-300 font-mono">
                    {recentAddedItem.price} {currency} • {language === 'ar' ? 'أضيف للسلة بنجاح' : 'Added to cart'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scanner Error & Fallback */}
          {scannerError && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center space-y-3 z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                {scannerError.isPermissionDenied ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="font-bold text-white text-sm">
                  {scannerError.isPermissionDenied
                    ? (language === 'ar' ? 'إذن الكاميرا مطلوب' : 'Camera Permission Required')
                    : (language === 'ar' ? 'تنبيه الكاميرا' : 'Camera Notice')}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">{scannerError.message}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => setRetryTrigger((prev) => prev + 1)}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إعادة المحاولة' : 'Retry Camera'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl border border-slate-700 flex items-center gap-1 cursor-pointer"
                  title={language === 'ar' ? 'فتح في تبويب مستقل لتجاوز قيود المعاينة' : 'Open in separate tab'}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'فتح في تبويب جديد' : 'Open in New Tab'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold py-2 px-3 rounded-xl border border-slate-700 cursor-pointer"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Manual Barcode Input Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Keyboard className={`w-4 h-4 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5`} />
              <input
                type="text"
                value={manualInputCode}
                onChange={(e) => setManualInputCode(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'أو اكتب رقم الباركود يدوياً هنا واضغط إدخال...'
                    : 'Or type barcode manually here & press Enter...'
                }
                className={`w-full bg-slate-950 border border-slate-700 rounded-xl ${
                  isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                } py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500`}
              />
            </div>
            <button
              type="submit"
              disabled={!manualInputCode.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0"
            >
              {language === 'ar' ? 'إدخال' : 'Enter'}
            </button>
          </form>
        </div>

        {/* Bottom Feedback Area & POS Session Stats */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 space-y-2.5">
          {lastScannedBarcode ? (
            lastFoundItem ? (
              <div className="bg-slate-900 border border-emerald-500/50 rounded-xl p-3 shadow-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs sm:text-sm text-white leading-tight truncate">
                        {lastFoundItem.name}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {lastFoundItem.barcode}
                        </span>
                        <span>{lastFoundItem.category || (language === 'ar' ? 'عام' : 'General')}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`shrink-0 ${isRTL ? 'text-left' : 'text-right'}`}>
                    <div className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                      {lastFoundItem.salePrice}{' '}
                      <span className="text-[10px] text-slate-400 font-sans">{currency}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {language === 'ar' ? 'المتاح: ' : 'Stock: '}
                      <span
                        className={`font-bold font-mono ${
                          lastFoundItem.quantity <= (lastFoundItem.minStockAlert || 5)
                            ? 'text-amber-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {lastFoundItem.quantity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions on Scanned Item */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddToCart(lastFoundItem);
                        if (!continuousScan) {
                          onClose();
                        }
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 sm:py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {mode === 'POS' && continuousScan
                          ? (language === 'ar' ? 'إضافة أخرى للسلة (+1)' : 'Add Another (+1)')
                          : (language === 'ar' ? 'إضافة للسلة / الفاتورة' : 'Add to Cart / Invoice')}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (onItemScanned) {
                        onItemScanned(lastFoundItem, lastScannedBarcode);
                      }
                      onClose();
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold py-1.5 sm:py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-700"
                  >
                    <span>{language === 'ar' ? 'عرض التفاصيل' : 'View Details'}</span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 space-y-2 text-rose-200 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white">
                        {language === 'ar'
                          ? 'صنف غير مسجل في المخزون!'
                          : 'Item not found in inventory!'}
                      </div>
                      <div className="text-[11px] text-rose-300 font-mono">
                        {language === 'ar' ? 'الباركود: ' : 'Barcode: '}
                        {lastScannedBarcode}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2 border-t border-rose-900/50">
                  {onAddNewItemWithBarcode ? (
                    <button
                      type="button"
                      id="btn-add-unregistered-item-from-scan"
                      onClick={() => {
                        const code = lastScannedBarcode;
                        onClose();
                        onAddNewItemWithBarcode(code);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {language === 'ar'
                          ? 'إضافة كصنف جديد بهذا الباركود'
                          : 'Register New Item With This Code'}
                      </span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {language === 'ar'
                        ? 'يمكنك تسجيل الباركود من قسم إدارة المخزون'
                        : 'Register this barcode from Inventory'}
                    </span>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="text-center py-1 text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>
                {language === 'ar'
                  ? 'الكاميرا جاهزة الآن للمسح السريع المباشر...'
                  : 'Camera ready for instant continuous scanning...'}
              </span>
            </div>
          )}

          {/* POS Continuous Mode Status & Session Stats */}
          {mode === 'POS' && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar'
                    ? 'إضافة فورية تلقائية إلى السلة مفعّلة'
                    : 'Auto-add to cart active'}
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono">
                {sessionScannedCount > 0 && (
                  <span className="text-cyan-400">
                    {language === 'ar' ? 'مرات المسح: ' : 'Scans: '}
                    <strong>{sessionScannedCount}</strong>
                  </span>
                )}
                {cartCount !== undefined && (
                  <span className="text-white flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3 text-emerald-400" />
                    <strong>{cartCount}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
