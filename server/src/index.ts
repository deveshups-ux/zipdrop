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
  res.json({
    status: 'ok',
    service: 'ZipDrop Signaling Server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e6, // 1 MB max signaling payload
});

interface PeerInfo {
  socketId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  roomId: string;
}

// In-memory room store: roomId -> Map<socketId, PeerInfo>
const rooms = new Map<string, Map<string, PeerInfo>>();

// Rate-limiting map for IP abuse prevention
const ipConnectionCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_CONNECTIONS_PER_MIN = 60;
const MAX_PEERS_PER_ROOM = 12;

// Middleware for basic IP rate limiting
io.use((socket, next) => {
  const ip = socket.handshake.address || 'unknown';
  const now = Date.now();
  const record = ipConnectionCounts.get(ip);

  if (!record || now > record.resetTime) {
    ipConnectionCounts.set(ip, { count: 1, resetTime: now + 60000 });
    return next();
  }

  if (record.count >= MAX_CONNECTIONS_PER_MIN) {
    console.warn(`[Security Alert] Rate limit exceeded for IP: ${ip}`);
    return next(new Error('Rate limit exceeded. Please wait a minute before reconnecting.'));
  }

  record.count += 1;
  next();
});

io.on('connection', (socket: Socket) => {
  console.log(`[Socket Connected] ID: ${socket.id} | IP: ${socket.handshake.address}`);

  // 1. Join or Create a Room (with input sanitization)
  socket.on(
    'join-room',
    ({
      roomId,
      deviceName,
      deviceType,
    }: {
      roomId: string;
      deviceName: string;
      deviceType: 'mobile' | 'desktop' | 'tablet';
    }) => {
      // Security: Validate and sanitize roomId
      if (!roomId || typeof roomId !== 'string') return;
      const cleanRoomId = roomId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').substring(0, 24);
      if (cleanRoomId.length < 2) return;

      // Security: Sanitize deviceName
      const cleanDeviceName =
        typeof deviceName === 'string'
          ? deviceName.trim().replace(/[<>]/g, '').substring(0, 32)
          : 'Anonymous Device';

      // Security: Validate deviceType
      const cleanDeviceType = ['mobile', 'desktop', 'tablet'].includes(deviceType)
        ? deviceType
        : 'desktop';

      if (!rooms.has(cleanRoomId)) {
        rooms.set(cleanRoomId, new Map());
      }

      const roomPeers = rooms.get(cleanRoomId)!;

      // Security: Prevent room flooding
      if (roomPeers.size >= MAX_PEERS_PER_ROOM) {
        socket.emit('error-notice', { message: 'This room has reached the maximum peer limit.' });
        return;
      }

      socket.join(cleanRoomId);

      const newPeer: PeerInfo = {
        socketId: socket.id,
        deviceName: cleanDeviceName,
        deviceType: cleanDeviceType,
        roomId: cleanRoomId,
      };

      // Notify others in the room about the new peer
      socket.to(cleanRoomId).emit('peer-joined', newPeer);

      // Send the list of existing peers in the room to the newly joined peer
      const existingPeers = Array.from(roomPeers.values());
      socket.emit('room-peers', existingPeers);

      // Save this peer into the room map
      roomPeers.set(socket.id, newPeer);

      console.log(
        `[Room ${cleanRoomId}] Peer joined: ${newPeer.deviceName} (${socket.id}). Total: ${roomPeers.size}`
      );
    }
  );

  // 2. WebRTC Signaling: Forward Offer, Answer, or ICE Candidate to a specific peer
  socket.on('signal', ({ targetSocketId, signalData }: { targetSocketId: string; signalData: any }) => {
    if (!targetSocketId || typeof targetSocketId !== 'string') return;
    io.to(targetSocketId).emit('signal', {
      senderSocketId: socket.id,
      signalData,
    });
  });

  // 3. Batch Transfer Request / Acceptance (Handshake prior to sending)
  socket.on('transfer-request', ({ targetSocketId, fileMeta }: { targetSocketId: string; fileMeta: any }) => {
    if (!targetSocketId || typeof targetSocketId !== 'string') return;
    io.to(targetSocketId).emit('transfer-request', {
      senderSocketId: socket.id,
      fileMeta,
    });
  });

  socket.on('transfer-response', ({ targetSocketId, accepted }: { targetSocketId: string; accepted: boolean }) => {
    if (!targetSocketId || typeof targetSocketId !== 'string') return;
    io.to(targetSocketId).emit('transfer-response', {
      senderSocketId: socket.id,
      accepted: Boolean(accepted),
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
  console.log(`🚀 ZipDrop Signaling Server running on port ${PORT}`);
});
