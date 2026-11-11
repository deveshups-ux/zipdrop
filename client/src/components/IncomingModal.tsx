import React from 'react';
import { motion } from 'framer-motion';
import { FileDown, Check, X, File } from 'lucide-react';
import type { BatchMeta } from '../types';
import { formatBytes } from '../utils/helpers';

interface IncomingModalProps {
  request: { senderSocketId: string; batchMeta: BatchMeta } | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingModal: React.FC<IncomingModalProps> = ({ request, onAccept, onDecline }) => {
  if (!request) return null;

  const { batchMeta } = request;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-2xl flex flex-col items-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
          <FileDown className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-gray-100">Incoming Files Request</h3>
        <p className="text-xs text-gray-400 text-center mt-1 mb-4">
          A nearby device wants to transfer {batchMeta.totalFiles} {batchMeta.totalFiles === 1 ? 'file' : 'files'} directly to you.
        </p>

        {/* Batch Summary & List Preview */}
        <div className="w-full bg-gray-950/70 border border-gray-800 rounded-xl p-3 mb-5">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800/80 text-xs font-semibold">
            <span className="text-gray-300">{batchMeta.totalFiles} files</span>
            <span className="text-cyan-400 font-mono">{formatBytes(batchMeta.totalBytes)}</span>
          </div>

          <div className="max-h-28 overflow-y-auto space-y-1 custom-scrollbar text-xs">
            {batchMeta.files.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center justify-between text-gray-400 py-0.5">
                <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                  <File className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <span className="font-mono text-[11px] text-gray-500 shrink-0">
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}
          </div>
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
            <span>Accept All</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
