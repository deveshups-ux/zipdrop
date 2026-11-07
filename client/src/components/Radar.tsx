import React from 'react';
import { motion } from 'framer-motion';
import { Laptop, Smartphone, Tablet, Send, ShieldCheck } from 'lucide-react';
import type { Peer } from '../types';

interface RadarProps {
  peers: Peer[];
  localDeviceName: string;
  localDeviceType: 'mobile' | 'desktop' | 'tablet';
  selectedPeer: Peer | null;
  onSelectPeer: (peer: Peer) => void;
  onSendClick: (peer: Peer) => void;
}

export const Radar: React.FC<RadarProps> = ({
  peers,
  localDeviceName,
  localDeviceType,
  selectedPeer,
  onSelectPeer,
  onSendClick,
}) => {
  const renderDeviceIcon = (type: 'mobile' | 'desktop' | 'tablet', className = 'w-6 h-6') => {
    switch (type) {
      case 'mobile':
        return <Smartphone className={className} />;
      case 'tablet':
        return <Tablet className={className} />;
      default:
        return <Laptop className={className} />;
    }
  };

  return (
    <div className="relative w-full max-w-2xl h-[420px] mx-auto flex items-center justify-center overflow-hidden rounded-3xl border border-gray-800/60 bg-gradient-to-b from-gray-900/60 to-gray-950/90 shadow-2xl backdrop-blur-xl">
      {/* Animated Radar Pulse Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[180, 280, 380].map((size, idx) => (
          <motion.div
            key={idx}
            className="absolute rounded-full border border-cyan-500/15"
            style={{ width: size, height: size }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.15, 0.4, 0.15],
            }}
            transition={{
              duration: 3 + idx,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: idx * 0.8,
            }}
          />
        ))}

        {/* Radar Sweep Line */}
        <motion.div
          className="absolute w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, rgba(6, 182, 212, 0.12) 0deg, transparent 60deg, transparent 360deg)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Center Device (You) */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative group">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[2px] shadow-lg shadow-cyan-500/25">
            <div className="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center text-cyan-400">
              {renderDeviceIcon(localDeviceType, 'w-7 h-7 text-cyan-300')}
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-gray-950 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-3 h-3 text-white" />
          </div>
        </div>
        <span className="mt-2 text-xs font-semibold text-gray-200">{localDeviceName} (You)</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Listening</span>
      </div>

      {/* Connected Peers Orbiting */}
      {peers.length === 0 ? (
        <div className="absolute bottom-6 text-center z-10 px-4">
          <p className="text-xs text-gray-400">No peers found nearby yet.</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Open ZipDrop on another device or scan the QR code to connect!
          </p>
        </div>
      ) : (
        peers.map((peer, index) => {
          // Calculate circular positions around the center
          const angle = (index / peers.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 130; // distance from center
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const isSelected = selectedPeer?.socketId === peer.socketId;

          return (
            <motion.div
              key={peer.socketId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, x, y }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="absolute z-20 flex flex-col items-center cursor-pointer"
              onClick={() => onSelectPeer(peer)}
            >
              <div
                className={`relative group flex flex-col items-center p-3 rounded-2xl transition-all duration-300 ${
                  isSelected
                    ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-xl shadow-cyan-500/30'
                    : 'bg-gray-800/80 border border-gray-700/80 hover:border-cyan-500/60 hover:bg-gray-800'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center text-gray-200 group-hover:text-cyan-400 transition-colors">
                  {renderDeviceIcon(peer.deviceType, 'w-6 h-6')}
                </div>

                <span className="mt-1.5 text-xs font-medium text-gray-200 max-w-[90px] truncate text-center">
                  {peer.deviceName}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendClick(peer);
                  }}
                  className="mt-1.5 flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold transition-all shadow-sm"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
};
