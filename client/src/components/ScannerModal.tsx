import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Keyboard, AlertCircle } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomSelect: (roomId: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onRoomSelect }) => {
  const [manualCode, setManualCode] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen || !useCamera) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
      return;
    }

    const scannerId = 'zipdrop-qr-reader';
    const html5QrCode = new Html5Qrcode(scannerId);
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: 'environment' }, // Back camera preferred on phones
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          // Check if scanned text is full URL with ?room= or direct room code
          try {
            const url = new URL(decodedText);
            const roomParam = url.searchParams.get('room');
            if (roomParam) {
              handleSuccess(roomParam);
              return;
            }
          } catch {
            // Not a valid URL, could be raw code like ZIP-XXXX
          }

          if (decodedText.startsWith('ZIP-') || decodedText.length >= 4) {
            handleSuccess(decodedText.trim().toUpperCase());
          }
        },
        () => {
          // Ignore transient frame scan errors
        }
      )
      .catch((err) => {
        console.warn('Camera access error:', err);
        setScannerError('Camera access denied or not available. Use manual code instead.');
        setUseCamera(false);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
    };
  }, [isOpen, useCamera]);

  const handleSuccess = (roomId: string) => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    onRoomSelect(roomId);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      let code = manualCode.trim().toUpperCase();
      if (!code.startsWith('ZIP-') && code.length === 4) {
        code = `ZIP-${code}`;
      }
      handleSuccess(code);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-2xl flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-gray-800/80 hover:bg-gray-850 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
          <Camera className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-gray-100">Join a Room</h3>
        <p className="text-xs text-gray-400 text-center mt-1 mb-4">
          Scan the QR code displayed on the other device or enter the room code.
        </p>

        {/* Tab Toggle */}
        <div className="flex w-full bg-gray-950 p-1 rounded-xl border border-gray-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setScannerError(null);
              setUseCamera(true);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              useCamera ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => setUseCamera(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              !useCamera ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Enter Code</span>
          </button>
        </div>

        {/* Camera Scanner View */}
        {useCamera ? (
          <div className="w-full flex flex-col items-center">
            <div className="relative w-full aspect-square max-w-[260px] rounded-2xl overflow-hidden border border-gray-800 bg-black flex items-center justify-center">
              <div id="zipdrop-qr-reader" className="w-full h-full" />
            </div>

            {scannerError && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{scannerError}</span>
              </div>
            )}
          </div>
        ) : (
          /* Manual Input View */
          <form onSubmit={handleManualSubmit} className="w-full flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Enter Room Code (e.g. ZIP-8K2Q or 8K2Q)
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="ZIP-XXXX"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-cyan-400 focus:outline-none text-center font-mono uppercase text-lg tracking-wider text-cyan-300 placeholder:text-gray-700"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-600/20"
            >
              Connect to Room
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
