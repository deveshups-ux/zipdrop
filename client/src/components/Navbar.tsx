import React, { useState } from 'react';
import { Zap, QrCode, Copy, Check, Radio, Camera } from 'lucide-react';

interface NavbarProps {
  roomId: string;
  deviceName: string;
  connected: boolean;
  onOpenQR: () => void;
  onOpenScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomId,
  deviceName,
  connected,
  onOpenQR,
  onOpenScanner,
}) => {
  const [copied, setCopied] = useState(false);

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between border-b border-gray-800/80 bg-gray-950/40 backdrop-blur-lg sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
              ZipDrop
            </h1>
            <span className="text-[9px] sm:text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
              P2P
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-400 flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="truncate max-w-[120px] sm:max-w-xs">
              {connected ? deviceName : 'Connecting...'}
            </span>
          </p>
        </div>
      </div>

      {/* Room Badge & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Room ID Pill */}
        <button
          onClick={copyRoomLink}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-gray-700 text-xs sm:text-sm font-medium text-gray-300 transition-all hover:bg-gray-850"
          title="Click to copy Room Link"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-mono text-cyan-300">{roomId}</span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
        </button>

        {/* Scan Camera Button (Mobile/Desktop) */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-cyan-500/40 text-gray-300 hover:text-cyan-300 text-xs sm:text-sm font-medium transition-all"
          title="Scan QR or Enter Code"
        >
          <Camera className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Join</span>
        </button>

        {/* Share QR Button */}
        <button
          onClick={onOpenQR}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-cyan-600/20"
          title="Show Room QR Code"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">Share QR</span>
        </button>
      </div>
    </header>
  );
};
