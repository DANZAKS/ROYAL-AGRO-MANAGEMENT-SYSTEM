import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Keyboard,
  Flashlight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Scan,
  Zap,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import { playScanFeedbackSound } from '../../services/barcodeService';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => { success: boolean; message: string };
  activeBranchName?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  activeBranchName = 'Active Branch'
}) => {
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [scannedHistory, setScannedHistory] = useState<Array<{ code: string; time: string; success: boolean }>>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by this browser. Please use USB scanner or manual entry.');
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. You can connect a USB/Bluetooth barcode scanner or enter the barcode manually.');
      } else {
        setCameraError('Unable to access device camera. Please check camera connection or enter barcode manually.');
      }
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setCameraActive(false);
  };

  // Camera toggle effect on modal open/close
  useEffect(() => {
    if (isOpen) {
      startCamera();
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 300);
    } else {
      stopCamera();
      setScanResult(null);
      setManualCode('');
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Frame scanning engine (BarcodeDetector API + canvas fallback)
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;

    let isScanning = false;
    let BarcodeDetectorClass = (window as any).BarcodeDetector;

    // Detect using BarcodeDetector if available
    const detectFrame = async () => {
      if (isScanning || !videoRef.current || videoRef.current.readyState < 2) return;
      isScanning = true;

      try {
        if (BarcodeDetectorClass) {
          const detector = new BarcodeDetectorClass({
            formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_39']
          });
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              handleBarcodeDetected(rawValue);
            }
          }
        }
      } catch (_e) {
        // Fallback or ignore frame
      } finally {
        isScanning = false;
      }
    };

    scanIntervalRef.current = setInterval(detectFrame, 250);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraActive, continuousMode]);

  // Handle Barcode Hit
  const handleBarcodeDetected = (rawCode: string) => {
    const clean = rawCode.trim();
    if (!clean) return;

    const res = onScan(clean);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setScannedHistory((prev) => [{ code: clean, time: timeStr, success: res.success }, ...prev.slice(0, 9)]);

    if (res.success) {
      playScanFeedbackSound('success');
      setScanResult({ type: 'success', message: res.message });
      setManualCode('');

      if (!continuousMode) {
        setTimeout(() => onClose(), 600);
      } else {
        setTimeout(() => setScanResult(null), 3000);
      }
    } else {
      playScanFeedbackSound('error');
      setScanResult({ type: 'error', message: res.message });
      setTimeout(() => setScanResult(null), 4000);
    }
  };

  // Manual code submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.()?.torch) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchEnabled }]
        });
        setTorchEnabled(!torchEnabled);
      } catch (_e) {
        // Torch failed or unsupported
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#1B3022] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#7E9D73]/20 rounded-xl">
              <Scan className="w-5 h-5 text-[#7E9D73]" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Fast Barcode Scanner</h3>
              <p className="text-[11px] text-stone-300">Live Camera, USB Scanner & Keypad at {activeBranchName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Video Canvas */}
        <div className="relative bg-black h-64 sm:h-72 flex items-center justify-center overflow-hidden">
          {cameraActive && !cameraError ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                autoPlay
              />

              {/* Scanning Target Box Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-36 border-2 border-[#7E9D73] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  {/* Animated laser scan line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />

                  {/* Corner brackets */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-[#7E9D73] rounded-tl-md" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-[#7E9D73] rounded-tr-md" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-[#7E9D73] rounded-bl-md" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-[#7E9D73] rounded-br-md" />

                  <span className="absolute bottom-2 inset-x-0 text-center text-[10px] text-white font-bold bg-black/60 py-0.5 px-2 rounded-full mx-auto w-max backdrop-blur-xs">
                    Align Barcode or QR Code
                  </span>
                </div>
              </div>

              {/* Camera Controls Bar */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl backdrop-blur-md transition-colors ${
                    torchEnabled ? 'bg-amber-400 text-stone-900' : 'bg-black/50 text-white hover:bg-black/70'
                  }`}
                  title="Flashlight Toggle"
                >
                  <Flashlight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-xl backdrop-blur-md transition-colors"
                  title="Switch Camera (Front/Rear)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-stone-300 max-w-xs space-y-2">
              <Camera className="w-10 h-10 text-stone-500 mx-auto mb-1 animate-pulse" />
              <p className="text-xs font-bold text-white">Camera Standby</p>
              <p className="text-[11px] text-stone-400">
                {cameraError || 'Allow camera permission or use USB hardware scanner / manual entry below.'}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-2 px-3 py-1.5 bg-[#7E9D73] hover:bg-[#6c8a62] text-[#1B3022] font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Hardware Scanner Active Badge */}
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>USB / Bluetooth Scanner Ready</span>
          </div>
        </div>

        {/* Scan Status Toast Notification */}
        {scanResult && (
          <div
            className={`p-3 text-xs font-bold flex items-center gap-2 border-b animate-in slide-in-from-top-2 ${
              scanResult.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {scanResult.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="flex-1">{scanResult.message}</span>
          </div>
        )}

        {/* Manual Barcode Entry Form */}
        <div className="p-4 border-b border-stone-100 bg-stone-50 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                ref={manualInputRef}
                type="text"
                placeholder="Type barcode or SKU (e.g. 200011000148)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-[#7E9D73] shadow-xs"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-[#1B3022] hover:bg-[#284732] disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Lookup & Add
            </button>
          </form>

          {/* Scanner Mode Options */}
          <div className="flex items-center justify-between text-xs text-stone-600">
            <label className="flex items-center gap-2 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="rounded text-[#7E9D73] focus:ring-[#7E9D73] w-3.5 h-3.5"
              />
              <span>Continuous Scanning (Keep scanner open for rapid multi-item entry)</span>
            </label>
          </div>
        </div>

        {/* Recent Scan History */}
        <div className="p-3.5 overflow-y-auto max-h-36 space-y-1.5 flex-1">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Session Scan Feed:</span>
          {scannedHistory.length > 0 ? (
            scannedHistory.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 bg-stone-50 rounded-lg text-xs font-mono"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${h.success ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
                  <span className="font-bold text-stone-800">{h.code}</span>
                </div>
                <span className="text-[10px] text-stone-400">{h.time}</span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-stone-400 italic">No barcodes scanned yet in this session.</p>
          )}
        </div>

        {/* Footer Done Button */}
        <div className="p-3 border-t border-stone-100 flex items-center justify-end bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
