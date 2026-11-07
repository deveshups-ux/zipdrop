import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, Send } from 'lucide-react';
import type { Peer } from '../types';
import { formatBytes } from '../utils/helpers';

interface DropZoneProps {
  selectedPeer: Peer | null;
  onSendFile: (peer: Peer, file: File) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ selectedPeer, onSendFile }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSend = () => {
    if (selectedPeer && selectedFile) {
      onSendFile(selectedPeer, selectedFile);
      setSelectedFile(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInput}
      />

      {!selectedFile ? (
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
            Drop your files here, or <span className="text-cyan-400 underline">browse</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Unlimited file size • End-to-end P2P • No cloud storage
          </p>
        </div>
      ) : (
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <File className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-200 max-w-[240px] sm:max-w-md truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-400">{formatBytes(selectedFile.size)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {selectedPeer ? (
              <button
                onClick={handleSend}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all shadow-lg shadow-cyan-600/30"
              >
                <Send className="w-4 h-4" />
                <span>Send to {selectedPeer.deviceName}</span>
              </button>
            ) : (
              <span className="text-xs text-amber-400 font-medium px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40">
                Select a device above
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
