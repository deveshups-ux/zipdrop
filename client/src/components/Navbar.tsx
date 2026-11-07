import React, { useState } from 'react';
import { Zap, QrCode, Copy, Check, Radio } from 'lucide-react';

interface NavbarProps {
  roomId: string;
  deviceName: string;
  connected: boolean;
  onOpenQR: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ roomId, deviceName, connected, onOpenQR }) => {
  const [copied, setCopied] = useState(false);

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between border-b border-gray-800/80">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Zap className="w-5 h-5 text-white fill-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
              ZipDrop
            </h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              P2P WebRTC
            </span>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            {connected ? deviceName : 'Connecting...'}
          </p>
        </div>
      </div>

      {/* Room Badge & Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={copyRoomLink}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-sm font-medium text-gray-300 transition-all hover:bg-gray-800/60"
          title="Click to copy Room Link"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-cyan-300">{roomId}</span>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
        </button>

        <button
          onClick={onOpenQR}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-all shadow-md shadow-cyan-600/20"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">Pair Device</span>
        </button>
      </div>
    </header>
  );
};
