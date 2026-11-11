import { useEffect, useRef, useState, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Radar } from './components/Radar';
import { DropZone } from './components/DropZone';
import { TransferModal } from './components/TransferModal';
import { QRModal } from './components/QRModal';
import { ScannerModal } from './components/ScannerModal';
import { IncomingModal } from './components/IncomingModal';
import { WebRTCManager } from './services/webrtc';
import type { BatchMeta, Peer, TransferProgress } from './types';
import { generateRoomCode, getDeviceDetails } from './utils/helpers';
import { ShieldCheck, Wifi, Zap, Lock } from 'lucide-react';

function getSignalingUrl(): string {
  if (import.meta.env.VITE_SIGNALING_URL) {
    return import.meta.env.VITE_SIGNALING_URL;
  }
  // Automatically adapt to the host accessing the frontend (localhost or 192.168.x.x)
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:5000`;
}

export function App() {
  const [roomId, setRoomId] = useState<string>('');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [connected, setConnected] = useState(false);

  // Modals
  const [isQROpen, setIsQROpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Transfer states
  const [activeTransfer, setActiveTransfer] = useState<TransferProgress | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<{ senderSocketId: string; batchMeta: BatchMeta } | null>(null);

  // Device Info
  const [deviceInfo] = useState(getDeviceDetails());

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const pendingBatchRef = useRef<{ peer: Peer; files: File[]; batchMeta: BatchMeta } | null>(null);

  // Setup WebRTC manager callbacks
  const attachManagerCallbacks = useCallback((manager: WebRTCManager) => {
    manager.onPeersUpdate = (updatedPeers) => {
      setPeers(updatedPeers);
      setConnected(true);
    };

    manager.onPeerJoined = (newPeer) => {
      setPeers((prev) => {
        if (prev.some((p) => p.socketId === newPeer.socketId)) return prev;
        return [...prev, newPeer];
      });
    };

    manager.onPeerLeft = (leftSocketId) => {
      setPeers((prev) => prev.filter((p) => p.socketId !== leftSocketId));
      setSelectedPeer((curr) => (curr?.socketId === leftSocketId ? null : curr));
    };

    manager.onProgress = (progress) => {
      setActiveTransfer(progress);
    };

    manager.onFileReceived = (fileName, blob) => {
      // Automatic download trigger for each received file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    manager.onIncomingRequest = (senderSocketId, batchMeta) => {
      setIncomingRequest({ senderSocketId, batchMeta });
    };

    manager.onTransferResponse = async (accepted) => {
      if (accepted && pendingBatchRef.current) {
        const { peer, files, batchMeta } = pendingBatchRef.current;
        try {
          await manager.sendBatch(peer.socketId, files, batchMeta);
        } catch (err) {
          console.error('File send error:', err);
          alert('Failed to send files. Check connection.');
        } finally {
          pendingBatchRef.current = null;
        }
      } else {
        alert('File transfer was declined by the receiver.');
        pendingBatchRef.current = null;
      }
    };
  }, []);

  // Connect to room
  const connectToRoom = useCallback(
    (targetRoom: string) => {
      if (webrtcRef.current) {
        webrtcRef.current.disconnect();
      }

      setPeers([]);
      setSelectedPeer(null);
      setConnected(false);

      const signalingUrl = getSignalingUrl();
      console.log(`Connecting to signaling at ${signalingUrl} for room ${targetRoom}`);

      const manager = new WebRTCManager(signalingUrl);
      webrtcRef.current = manager;
      attachManagerCallbacks(manager);

      manager.joinRoom(targetRoom, deviceInfo.deviceName, deviceInfo.deviceType);
    },
    [attachManagerCallbacks, deviceInfo]
  );

  useEffect(() => {
    // 1. Determine Room ID (from URL parameter or generate fresh)
    const urlParams = new URLSearchParams(window.location.search);
    let currentRoom = urlParams.get('room');

    if (!currentRoom) {
      currentRoom = generateRoomCode();
      const newUrl = `${window.location.pathname}?room=${currentRoom}`;
      window.history.replaceState(null, '', newUrl);
    }

    setRoomId(currentRoom);
    connectToRoom(currentRoom);

    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.disconnect();
      }
    };
  }, [connectToRoom]);

  // Actions
  const handleSelectPeer = (peer: Peer) => {
    setSelectedPeer((prev) => (prev?.socketId === peer.socketId ? null : peer));
  };

  const handleSendFiles = (peer: Peer, files: File[]) => {
    if (!webrtcRef.current || files.length === 0) return;
    const batchMeta = webrtcRef.current.requestSendBatch(peer.socketId, files);
    pendingBatchRef.current = { peer, files, batchMeta };
  };

  const handleAcceptIncoming = () => {
    if (!incomingRequest || !webrtcRef.current) return;
    webrtcRef.current.respondTransfer(incomingRequest.senderSocketId, true);
    setIncomingRequest(null);
  };

  const handleDeclineIncoming = () => {
    if (!incomingRequest || !webrtcRef.current) return;
    webrtcRef.current.respondTransfer(incomingRequest.senderSocketId, false);
    setIncomingRequest(null);
  };

  const handleRoomSelect = (newRoom: string) => {
    if (newRoom === roomId) return;
    const newUrl = `${window.location.pathname}?room=${newRoom}`;
    window.history.pushState(null, '', newUrl);
    setRoomId(newRoom);
    connectToRoom(newRoom);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-gray-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        roomId={roomId}
        deviceName={deviceInfo.deviceName}
        connected={connected}
        onOpenQR={() => setIsQROpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col items-center">
        {/* Radar View with connected devices */}
        <Radar
          peers={peers}
          localDeviceName={deviceInfo.deviceName}
          localDeviceType={deviceInfo.deviceType}
          selectedPeer={selectedPeer}
          onSelectPeer={handleSelectPeer}
          onSendClick={(peer) => {
            setSelectedPeer(peer);
          }}
        />

        {/* Multi-File Drop Zone */}
        <DropZone selectedPeer={selectedPeer} onSendFiles={handleSendFiles} />

        {/* Feature Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-gray-500 font-medium select-none">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <span>Local WiFi Direct Speed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>End-to-End Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Multi-File Queue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Zero Server Storage</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 border-t border-gray-900/80 text-xs text-gray-600 select-none">
        ZipDrop • Universal P2P File Transfer Protocol • WebRTC & React
      </footer>

      {/* Modals */}
      <QRModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} roomId={roomId} />
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onRoomSelect={handleRoomSelect}
      />
      <IncomingModal
        request={incomingRequest}
        onAccept={handleAcceptIncoming}
        onDecline={handleDeclineIncoming}
      />
      <TransferModal
        transfer={activeTransfer}
        onClose={() => setActiveTransfer(null)}
      />
    </div>
  );
}

export default App;
