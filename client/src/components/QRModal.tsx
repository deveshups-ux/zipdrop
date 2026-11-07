import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Smartphone } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, roomId }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-2xl flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
          <Smartphone className="w-5 h-5" />
        </div>

        <h3 className="text-base font-bold text-gray-100">Scan to Connect Phone</h3>
        <p className="text-xs text-gray-400 text-center mt-1 mb-5">
          Scan this QR code with your phone camera to join this room instantly.
        </p>

        {/* QR Code Container with High Contrast */}
        <div className="p-4 rounded-2xl bg-white shadow-xl flex items-center justify-center">
          <QRCodeSVG value={roomUrl} size={190} level="M" />
        </div>

        {/* Room Code Pill */}
        <div className="mt-5 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-950 border border-gray-800">
          <span className="text-xs text-gray-400 font-medium">Room Code:</span>
          <span className="text-sm font-mono font-bold text-cyan-400">{roomId}</span>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1 text-xs text-gray-300 hover:text-white px-2 py-1 rounded-md bg-gray-800 hover:bg-gray-750 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
