import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, Send, Files } from 'lucide-react';
import type { Peer } from '../types';
import { formatBytes } from '../utils/helpers';

interface DropZoneProps {
  selectedPeer: Peer | null;
  onSendFiles: (peer: Peer, files: File[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ selectedPeer, onSendFiles }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragOver(true);
    } else if (e.type === 'dragleave') {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    if (selectedPeer && selectedFiles.length > 0) {
      onSendFiles(selectedPeer, selectedFiles);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {selectedFiles.length === 0 ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            dragOver
              ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]'
              : 'border-gray-800 hover:border-gray-700 bg-gray-900/40 hover:bg-gray-900/60'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-gray-800/80 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-gray-200 text-center">
            Drop multiple files here, or <span className="text-cyan-400 underline">browse</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Unlimited file size • Multi-file queue • End-to-end P2P
          </p>
        </div>
      ) : (
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-xl">
          {/* Header Summary */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Files className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                </p>
                <p className="text-xs text-gray-400">Total: {formatBytes(totalBytes)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-cyan-400 hover:underline px-2 py-1"
              >
                + Add more
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 hover:bg-gray-800 rounded-md transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Files List Preview */}
          <div className="max-h-36 overflow-y-auto py-2 space-y-1.5 custom-scrollbar">
            {selectedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-950/60 border border-gray-800/80 text-xs"
              >
                <div className="flex items-center gap-2 truncate max-w-[80%]">
                  <File className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-gray-200 truncate">{file.name}</span>
                  <span className="text-gray-500 font-mono text-[11px] shrink-0">
                    ({formatBytes(file.size)})
                  </span>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-900 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-gray-800 flex items-center justify-end">
            {selectedPeer ? (
              <button
                onClick={handleSend}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all shadow-lg shadow-cyan-600/30"
              >
                <Send className="w-4 h-4" />
                <span>
                  Send {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} to {selectedPeer.deviceName}
                </span>
              </button>
            ) : (
              <span className="text-xs text-amber-400 font-medium px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40">
                Select a device above on the radar
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
