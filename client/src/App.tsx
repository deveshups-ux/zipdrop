import { useEffect, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Radar } from './components/Radar';
import { DropZone } from './components/DropZone';
import { TransferModal } from './components/TransferModal';
import { QRModal } from './components/QRModal';
import { IncomingModal } from './components/IncomingModal';
import { WebRTCManager } from './services/webrtc';
import type { FileMeta, Peer, TransferProgress } from './types';
import { generateRoomCode, getDeviceDetails } from './utils/helpers';
import { ShieldCheck, Wifi, Zap } from 'lucide-react';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:5000';

export function App() {
  const [roomId, setRoomId] = useState<string>('');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [connected, setConnected] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);

  // Transfer states
  const [activeTransfer, setActiveTransfer] = useState<TransferProgress | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<{ senderSocketId: string; fileMeta: FileMeta } | null>(null);

  // Device Info
  const [deviceInfo] = useState(getDeviceDetails());

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const pendingFileRef = useRef<{ peer: Peer; file: File; meta: FileMeta } | null>(null);

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

    // 2. Initialize WebRTC Manager
    const manager = new WebRTCManager(SIGNALING_URL);
    webrtcRef.current = manager;

    // Callbacks
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
      // Automatic download trigger
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    manager.onIncomingRequest = (senderSocketId, fileMeta) => {
      setIncomingRequest({ senderSocketId, fileMeta });
    };

    manager.onTransferResponse = async (accepted) => {
      if (accepted && pendingFileRef.current) {
        const { peer, file, meta } = pendingFileRef.current;
        try {
          await manager.sendFile(peer.socketId, file, meta);
        } catch (err) {
          console.error('File send error:', err);
          alert('Failed to send file. Check connection.');
        } finally {
          pendingFileRef.current = null;
        }
      } else {
        alert('File transfer was declined by the receiver.');
        pendingFileRef.current = null;
      }
    };

    // Join room
    manager.joinRoom(currentRoom, deviceInfo.deviceName, deviceInfo.deviceType);

    return () => {
      manager.disconnect();
    };
  }, [deviceInfo]);

  // Actions
  const handleSelectPeer = (peer: Peer) => {
    setSelectedPeer((prev) => (prev?.socketId === peer.socketId ? null : peer));
  };

  const handleSendFile = (peer: Peer, file: File) => {
    if (!webrtcRef.current) return;
    const meta = webrtcRef.current.requestSendFile(peer.socketId, file);
    pendingFileRef.current = { peer, file, meta };
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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        roomId={roomId}
        deviceName={deviceInfo.deviceName}
        connected={connected}
        onOpenQR={() => setIsQROpen(true)}
      />

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
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

        {/* Drop Zone */}
        <DropZone selectedPeer={selectedPeer} onSendFile={handleSendFile} />

        {/* Feature Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <span>Local WiFi Direct Speed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>End-to-End Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-blue-400" />
            <span>0 Byte Stored on Server</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 border-t border-gray-900 text-xs text-gray-600">
        ZipDrop • Zero-Server P2P File Transfer Protocol • Built with WebRTC & React
      </footer>

      {/* Modals */}
      <QRModal isOpen={isQROpen} onClose={() => setIsQROpen(false)} roomId={roomId} />
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
