import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ZipDrop Signaling Server' });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

interface PeerInfo {
  socketId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  roomId: string;
}

// In-memory room store: roomId -> Map<socketId, PeerInfo>
const rooms = new Map<string, Map<string, PeerInfo>>();

io.on('connection', (socket: Socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // 1. Join or Create a Room
  socket.on('join-room', ({ roomId, deviceName, deviceType }: { roomId: string; deviceName: string; deviceType: 'mobile' | 'desktop' | 'tablet' }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    const roomPeers = rooms.get(roomId)!;
    const newPeer: PeerInfo = {
      socketId: socket.id,
      deviceName: deviceName || 'Anonymous Device',
      deviceType: deviceType || 'desktop',
      roomId,
    };

    // Notify others in the room about the new peer
    socket.to(roomId).emit('peer-joined', newPeer);

    // Send the list of existing peers in the room to the newly joined peer
    const existingPeers = Array.from(roomPeers.values());
    socket.emit('room-peers', existingPeers);

    // Save this peer into the room map
    roomPeers.set(socket.id, newPeer);

    console.log(`[Room ${roomId}] Peer joined: ${newPeer.deviceName} (${socket.id}). Total: ${roomPeers.size}`);
  });

  // 2. WebRTC Signaling: Forward Offer, Answer, or ICE Candidate to a specific peer
  socket.on('signal', ({ targetSocketId, signalData }: { targetSocketId: string; signalData: any }) => {
    // Forward the signal directly to the intended peer
    io.to(targetSocketId).emit('signal', {
      senderSocketId: socket.id,
      signalData,
    });
  });

  // 3. File Transfer Request / Acceptance (Handshake prior to sending)
  socket.on('transfer-request', ({ targetSocketId, fileMeta }: { targetSocketId: string; fileMeta: any }) => {
    io.to(targetSocketId).emit('transfer-request', {
      senderSocketId: socket.id,
      fileMeta,
    });
  });

  socket.on('transfer-response', ({ targetSocketId, accepted }: { targetSocketId: string; accepted: boolean }) => {
    io.to(targetSocketId).emit('transfer-response', {
      senderSocketId: socket.id,
      accepted,
    });
  });

  // 4. Handle Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);

    // Clean up peer from whatever room they were in
    rooms.forEach((peersMap, roomId) => {
      if (peersMap.has(socket.id)) {
        const leftPeer = peersMap.get(socket.id);
        peersMap.delete(socket.id);

        // Notify other room members
        socket.to(roomId).emit('peer-left', { socketId: socket.id, deviceName: leftPeer?.deviceName });

        // If room is empty, delete it to free memory
        if (peersMap.size === 0) {
          rooms.delete(roomId);
          console.log(`[Room ${roomId}] Room deleted (empty).`);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 ZipDrop Signaling Server running on http://localhost:${PORT}`);
});
