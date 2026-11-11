import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Laptop, Smartphone, Tablet, Send, ShieldCheck, Wifi } from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const renderDeviceIcon = (type: 'mobile' | 'desktop' | 'tablet', className = 'w-5 h-5 sm:w-6 sm:h-6') => {
    switch (type) {
      case 'mobile':
        return <Smartphone className={className} />;
      case 'tablet':
        return <Tablet className={className} />;
      default:
        return <Laptop className={className} />;
    }
  };

  const ringSizes = isMobile ? [130, 200, 270] : [170, 260, 350];
  const orbitRadius = isMobile ? 95 : 130;

  return (
    <div className="relative w-full max-w-2xl h-[330px] sm:h-[400px] mx-auto flex items-center justify-center overflow-hidden rounded-3xl border border-gray-800/80 bg-gradient-to-b from-gray-900/70 via-gray-950/80 to-[#070b14] shadow-2xl backdrop-blur-xl">
      {/* Animated Radar Pulse Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {ringSizes.map((size, idx) => (
          <motion.div
            key={idx}
            className="absolute rounded-full border border-cyan-500/15"
            style={{ width: size, height: size }}
            animate={{
              scale: [1, 1.06, 1],
              opacity: [0.15, 0.35, 0.15],
            }}
            transition={{
              duration: 3 + idx,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: idx * 0.7,
            }}
          />
        ))}

        {/* Radar Sweep Line */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: ringSizes[2],
            height: ringSizes[2],
            background:
              'conic-gradient(from 0deg at 50% 50%, rgba(6, 182, 212, 0.12) 0deg, transparent 55deg, transparent 360deg)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Center Device (You) */}
      <div className="relative z-10 flex flex-col items-center select-none">
        <div className="relative group">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[2px] shadow-lg shadow-cyan-500/25">
            <div className="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center text-cyan-400">
              {renderDeviceIcon(localDeviceType, 'w-6 h-6 sm:w-7 sm:h-7 text-cyan-300')}
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-gray-950 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-3 h-3 text-white" />
          </div>
        </div>
        <span className="mt-2 text-xs font-semibold text-gray-200 text-center max-w-[130px] truncate">
          {localDeviceName} <span className="text-cyan-400 font-normal">(You)</span>
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono flex items-center gap-1">
          <Wifi className="w-2.5 h-2.5 text-emerald-400" />
          Listening
        </span>
      </div>

      {/* Connected Peers Orbiting */}
      {peers.length === 0 ? (
        <div className="absolute bottom-4 sm:bottom-6 text-center z-10 px-4 select-none">
          <p className="text-xs text-gray-400 font-medium">Looking for nearby devices...</p>
          <p className="text-[11px] text-gray-500 mt-0.5 max-w-xs mx-auto">
            Open ZipDrop on your other phone or laptop to transfer directly!
          </p>
        </div>
      ) : (
        peers.map((peer, index) => {
          const angle = (index / peers.length) * 2 * Math.PI - Math.PI / 2;
          const x = Math.cos(angle) * orbitRadius;
          const y = Math.sin(angle) * orbitRadius;
          const isSelected = selectedPeer?.socketId === peer.socketId;

          return (
            <motion.div
              key={peer.socketId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, x, y }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="absolute z-20 flex flex-col items-center cursor-pointer select-none"
              onClick={() => onSelectPeer(peer)}
            >
              <div
                className={`relative group flex flex-col items-center p-2 sm:p-2.5 rounded-2xl transition-all duration-300 ${
                  isSelected
                    ? 'bg-cyan-500/25 border-2 border-cyan-400 shadow-xl shadow-cyan-500/40 scale-105'
                    : 'bg-gray-900/90 border border-gray-700/80 hover:border-cyan-500/60 hover:bg-gray-850 shadow-lg'
                }`}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gray-950 flex items-center justify-center text-gray-300 group-hover:text-cyan-400 transition-colors">
                  {renderDeviceIcon(peer.deviceType, 'w-5 h-5 sm:w-6 sm:h-6')}
                </div>

                <span className="mt-1 text-[11px] sm:text-xs font-semibold text-gray-200 max-w-[80px] sm:max-w-[100px] truncate text-center">
                  {peer.deviceName}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendClick(peer);
                  }}
                  className="mt-1 flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold transition-all shadow-sm"
                >
                  <Send className="w-2.5 h-2.5" />
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
