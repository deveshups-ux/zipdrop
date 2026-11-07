import React from 'react';
import { motion } from 'framer-motion';
import { FileDown, Check, X } from 'lucide-react';
import type { FileMeta } from '../types';
import { formatBytes } from '../utils/helpers';

interface IncomingModalProps {
  request: { senderSocketId: string; fileMeta: FileMeta } | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingModal: React.FC<IncomingModalProps> = ({ request, onAccept, onDecline }) => {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-2xl flex flex-col items-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
          <FileDown className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-gray-100">Incoming File Request</h3>
        <p className="text-xs text-gray-400 text-center mt-1 mb-4">
          A nearby device wants to transfer a file directly to you via WebRTC.
        </p>

        <div className="w-full bg-gray-950/70 border border-gray-800 rounded-xl p-3 mb-5">
          <p className="text-sm font-semibold text-gray-200 truncate">{request.fileMeta.name}</p>
          <p className="text-xs text-cyan-400 font-mono mt-0.5">{formatBytes(request.fileMeta.size)}</p>
        </div>

        <div className="w-full flex items-center gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Decline</span>
          </button>

          <button
            onClick={onAccept}
            className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Accept & Receive</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
