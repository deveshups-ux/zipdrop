import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, Zap } from 'lucide-react';
import type { TransferProgress } from '../types';
import { formatBytes } from '../utils/helpers';

interface TransferModalProps {
  transfer: TransferProgress | null;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ transfer, onClose }) => {
  if (!transfer) return null;

  const isSending = transfer.type === 'sending';
  const isDone = transfer.status === 'completed';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="relative w-full max-w-md rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-2xl overflow-hidden"
        >
          {/* Subtle Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-500/10 blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isDone
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : isSending
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isSending ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownLeft className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200">
                  {isDone
                    ? 'Transfer Complete!'
                    : isSending
                    ? 'Sending File (P2P)...'
                    : 'Receiving File (P2P)...'}
                </h3>
                <p className="text-xs text-gray-400 font-mono flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  {transfer.speed}
                </p>
              </div>
            </div>

            <span className="text-lg font-bold font-mono text-cyan-400">
              {transfer.progress}%
            </span>
          </div>

          {/* File Details */}
          <div className="bg-gray-950/60 rounded-xl p-3 border border-gray-800/80 mb-4">
            <p className="text-sm font-medium text-gray-200 truncate">{transfer.fileName}</p>
            <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
              <span>{formatBytes(transfer.bytesTransferred)} transferred</span>
              <span>Total: {formatBytes(transfer.fileSize)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-gray-800 overflow-hidden mb-6">
            <motion.div
              className={`h-full rounded-full transition-all duration-150 ${
                isDone
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600'
              }`}
              style={{ width: `${transfer.progress}%` }}
            />
          </div>

          {/* Action */}
          {isDone ? (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20"
            >
              Done
            </button>
          ) : (
            <p className="text-center text-xs text-gray-500 animate-pulse">
              Transferring directly over local WebRTC pipe. Do not close this tab.
            </p>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
