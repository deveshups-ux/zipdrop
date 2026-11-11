import { io, Socket } from 'socket.io-client';
import type { BatchMeta, FileMeta, Peer, TransferProgress } from '../types';
import { CHUNK_SIZE, formatBytes } from '../utils/helpers';

// STUN and TURN configuration for 100% reliable NAT traversal across firewalls (Jio/Airtel 5G, College WiFi, etc.)
function getIceServers(): RTCConfiguration {
  const customTurnUrl = import.meta.env.VITE_TURN_SERVER_URL;
  const customTurnUsername = import.meta.env.VITE_TURN_USERNAME;
  const customTurnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  const iceServers: RTCIceServer[] = [
    // 1. Google Public STUN (Fast, direct P2P resolution)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
  ];

  if (customTurnUrl && customTurnUsername && customTurnCredential) {
    // 2. Personal Metered.ca TURN credentials if provided in .env
    iceServers.push({
      urls: customTurnUrl,
      username: customTurnUsername,
      credential: customTurnCredential,
    });
  } else {
    // 3. OpenRelay (by Metered.ca) - Free Community TURN Fallback
    iceServers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    );
  }

  return { iceServers };
}

export class WebRTCManager {
  private socket: Socket;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();

  // Receiving state for queue / batch
  private activeReceivingBatch: {
    batchId: string;
    fileIndex: number;
    totalFiles: number;
    totalBatchBytes: number;
    batchBytesPrior: number;
    meta: FileMeta;
    chunks: ArrayBuffer[];
    bytesReceived: number;
    startTime: number;
  } | null = null;

  // Event callbacks
  public onPeersUpdate?: (peers: Peer[]) => void;
  public onPeerJoined?: (peer: Peer) => void;
  public onPeerLeft?: (socketId: string) => void;
  public onProgress?: (progress: TransferProgress) => void;
  public onFileReceived?: (fileName: string, blob: Blob, fileIndex: number, totalFiles: number) => void;
  public onIncomingRequest?: (senderSocketId: string, batchMeta: BatchMeta) => void;
  public onTransferResponse?: (accepted: boolean) => void;

  constructor(serverUrl: string) {
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.setupSocketListeners();
  }

  public getSocketId(): string {
    return this.socket.id || '';
  }

  public joinRoom(roomId: string, deviceName: string, deviceType: 'mobile' | 'desktop' | 'tablet') {
    this.socket.emit('join-room', { roomId, deviceName, deviceType });
  }

  private setupSocketListeners() {
    this.socket.on('room-peers', (peers: Peer[]) => {
      // Connect to existing peers
      peers.forEach((peer) => {
        this.initiatePeerConnection(peer.socketId, true);
      });
      if (this.onPeersUpdate) this.onPeersUpdate(peers);
    });

    this.socket.on('peer-joined', (peer: Peer) => {
      if (this.onPeerJoined) this.onPeerJoined(peer);
    });

    this.socket.on('peer-left', ({ socketId }: { socketId: string }) => {
      this.closePeer(socketId);
      if (this.onPeerLeft) this.onPeerLeft(socketId);
    });

    // WebRTC Signaling messages (Offer, Answer, ICE candidates)
    this.socket.on('signal', async ({ senderSocketId, signalData }: { senderSocketId: string; signalData: any }) => {
      let pc = this.peerConnections.get(senderSocketId);

      if (!pc) {
        pc = this.initiatePeerConnection(senderSocketId, false);
      }

      try {
        if (signalData.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          this.socket.emit('signal', {
            targetSocketId: senderSocketId,
            signalData: answer,
          });
        } else if (signalData.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        } else if (signalData.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    // Batch transfer prompts
    this.socket.on('transfer-request', ({ senderSocketId, fileMeta }: { senderSocketId: string; fileMeta: BatchMeta }) => {
      if (this.onIncomingRequest) {
        this.onIncomingRequest(senderSocketId, fileMeta);
      }
    });

    this.socket.on('transfer-response', ({ accepted }: { accepted: boolean }) => {
      if (this.onTransferResponse) {
        this.onTransferResponse(accepted);
      }
    });
  }

  // Initiate peer connection
  private initiatePeerConnection(targetSocketId: string, isInitiator: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection(getIceServers());
    this.peerConnections.set(targetSocketId, pc);

    // ICE Candidate Exchange
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal', {
          targetSocketId,
          signalData: { candidate: event.candidate },
        });
      }
    };

    if (isInitiator) {
      // Initiator creates data channel
      const dc = pc.createDataChannel('zipdrop-channel', { ordered: true });
      this.setupDataChannel(targetSocketId, dc);

      // Create Offer
      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        this.socket.emit('signal', {
          targetSocketId,
          signalData: offer,
        });
      });
    } else {
      // Receiver listens for incoming data channel
      pc.ondatachannel = (event) => {
        this.setupDataChannel(targetSocketId, event.channel);
      };
    }

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC State with ${targetSocketId}]: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeer(targetSocketId);
      }
    };

    return pc;
  }

  // Setup RTCDataChannel for high-speed binary transfers
  private setupDataChannel(socketId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    this.dataChannels.set(socketId, dc);

    dc.onopen = () => {
      console.log(`⚡ Direct WebRTC Data Channel OPEN with: ${socketId}`);
    };

    dc.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };

    dc.onclose = () => {
      console.log(`Data Channel closed with: ${socketId}`);
      this.dataChannels.delete(socketId);
    };
  }

  // Handle incoming data (Header JSON, Binary Chunks, or Completion)
  private handleIncomingData(data: ArrayBuffer | string) {
    if (typeof data === 'string') {
      try {
        const message = JSON.parse(data);

        if (message.type === 'header') {
          const meta: FileMeta = message.meta;
          this.activeReceivingBatch = {
            batchId: message.batchId,
            fileIndex: message.fileIndex,
            totalFiles: message.totalFiles,
            totalBatchBytes: message.totalBatchBytes,
            batchBytesPrior: message.batchBytesPrior,
            meta,
            chunks: [],
            bytesReceived: 0,
            startTime: Date.now(),
          };

          if (this.onProgress) {
            this.onProgress({
              batchId: message.batchId,
              currentFileIndex: message.fileIndex,
              totalFiles: message.totalFiles,
              fileId: meta.id,
              fileName: meta.name,
              fileSize: meta.size,
              progress: 0,
              totalBatchProgress: Math.round((message.batchBytesPrior / message.totalBatchBytes) * 100),
              bytesTransferred: 0,
              totalBytesTransferred: message.batchBytesPrior,
              totalBatchBytes: message.totalBatchBytes,
              speed: '0 B/s',
              type: 'receiving',
              status: 'transferring',
            });
          }
        } else if (message.type === 'complete') {
          const batch = this.activeReceivingBatch;
          if (batch && batch.meta.id === message.fileId) {
            const blob = new Blob(batch.chunks, { type: batch.meta.type || 'application/octet-stream' });

            const isLast = message.isLastFile;

            if (this.onProgress) {
              this.onProgress({
                batchId: batch.batchId,
                currentFileIndex: batch.fileIndex,
                totalFiles: batch.totalFiles,
                fileId: batch.meta.id,
                fileName: batch.meta.name,
                fileSize: batch.meta.size,
                progress: 100,
                totalBatchProgress: isLast ? 100 : Math.round(((batch.batchBytesPrior + batch.meta.size) / batch.totalBatchBytes) * 100),
                bytesTransferred: batch.meta.size,
                totalBytesTransferred: batch.batchBytesPrior + batch.meta.size,
                totalBatchBytes: batch.totalBatchBytes,
                speed: isLast ? 'All Done' : 'Next File...',
                type: 'receiving',
                status: isLast ? 'completed' : 'transferring',
              });
            }

            if (this.onFileReceived) {
              this.onFileReceived(batch.meta.name, blob, batch.fileIndex, batch.totalFiles);
            }

            // Clear chunks array immediately to release browser memory
            batch.chunks = [];

            if (isLast) {
              this.activeReceivingBatch = null;
            }
          }
        }
      } catch (err) {
        console.error('Error parsing JSON message on data channel:', err);
      }
    } else if (data instanceof ArrayBuffer) {
      const batch = this.activeReceivingBatch;
      if (batch) {
        batch.chunks.push(data);
        batch.bytesReceived += data.byteLength;

        const filePercent = Math.min(100, Math.round((batch.bytesReceived / batch.meta.size) * 100));
        const totalBytesSoFar = batch.batchBytesPrior + batch.bytesReceived;
        const totalBatchPercent = Math.min(100, Math.round((totalBytesSoFar / batch.totalBatchBytes) * 100));

        const timeElapsed = (Date.now() - batch.startTime) / 1000 || 1;
        const bytesPerSec = batch.bytesReceived / timeElapsed;
        const speedFormatted = `${formatBytes(bytesPerSec)}/s`;

        if (this.onProgress) {
          this.onProgress({
            batchId: batch.batchId,
            currentFileIndex: batch.fileIndex,
            totalFiles: batch.totalFiles,
            fileId: batch.meta.id,
            fileName: batch.meta.name,
            fileSize: batch.meta.size,
            progress: filePercent,
            totalBatchProgress: totalBatchPercent,
            bytesTransferred: batch.bytesReceived,
            totalBytesTransferred: totalBytesSoFar,
            totalBatchBytes: batch.totalBatchBytes,
            speed: speedFormatted,
            type: 'receiving',
            status: 'transferring',
          });
        }
      }
    }
  }

  // Request to send multiple files (Batch)
  public requestSendBatch(targetSocketId: string, files: File[]): BatchMeta {
    const batchId = Math.random().toString(36).substring(2, 9);
    let totalBytes = 0;

    const filesMeta: FileMeta[] = files.map((file) => {
      totalBytes += file.size;
      return {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        totalChunks: Math.ceil(file.size / CHUNK_SIZE),
      };
    });

    const batchMeta: BatchMeta = {
      batchId,
      totalFiles: files.length,
      totalBytes,
      files: filesMeta,
    };

    this.socket.emit('transfer-request', {
      targetSocketId,
      fileMeta: batchMeta,
    });

    return batchMeta;
  }

  public respondTransfer(targetSocketId: string, accepted: boolean) {
    this.socket.emit('transfer-response', {
      targetSocketId,
      accepted,
    });
  }

  // Send batch files sequentially in a queue with Backpressure Control
  public async sendBatch(targetSocketId: string, files: File[], batchMeta: BatchMeta) {
    const dc = this.dataChannels.get(targetSocketId);
    if (!dc || dc.readyState !== 'open') {
      throw new Error('Data Channel is not open. Cannot transfer files.');
    }

    // Set buffer threshold for backpressure (64 KB)
    dc.bufferedAmountLowThreshold = 65536;

    let totalBytesSentOverall = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const meta = batchMeta.files[i];
      const isLastFile = i === files.length - 1;
      const batchBytesPrior = totalBytesSentOverall;

      // 1. Send File Header Packet
      dc.send(
        JSON.stringify({
          type: 'header',
          batchId: batchMeta.batchId,
          fileIndex: i + 1,
          totalFiles: batchMeta.totalFiles,
          totalBatchBytes: batchMeta.totalBytes,
          batchBytesPrior,
          meta,
        })
      );

      const fileStartTime = Date.now();
      let offset = 0;
      let fileBytesSent = 0;

      while (offset < file.size) {
        // BACKPRESSURE CHECK: If buffer is full (> 512 KB), wait for it to drain
        if (dc.bufferedAmount > 524288) {
          await new Promise<void>((resolve) => {
            dc.onbufferedamountlow = () => {
              dc.onbufferedamountlow = null;
              resolve();
            };
          });
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await slice.arrayBuffer();

        dc.send(buffer);

        offset += buffer.byteLength;
        fileBytesSent += buffer.byteLength;
        const currentTotalBytes = batchBytesPrior + fileBytesSent;

        const filePercent = Math.min(100, Math.round((fileBytesSent / file.size) * 100));
        const totalBatchPercent = Math.min(100, Math.round((currentTotalBytes / batchMeta.totalBytes) * 100));

        const timeElapsed = (Date.now() - fileStartTime) / 1000 || 1;
        const bytesPerSec = fileBytesSent / timeElapsed;
        const speedFormatted = `${formatBytes(bytesPerSec)}/s`;

        if (this.onProgress) {
          this.onProgress({
            batchId: batchMeta.batchId,
            currentFileIndex: i + 1,
            totalFiles: batchMeta.totalFiles,
            fileId: meta.id,
            fileName: file.name,
            fileSize: file.size,
            progress: filePercent,
            totalBatchProgress: totalBatchPercent,
            bytesTransferred: fileBytesSent,
            totalBytesTransferred: currentTotalBytes,
            totalBatchBytes: batchMeta.totalBytes,
            speed: speedFormatted,
            type: 'sending',
            status: isLastFile && filePercent === 100 ? 'completed' : 'transferring',
          });
        }
      }

      totalBytesSentOverall += file.size;

      // 2. Send Complete packet for this file
      dc.send(
        JSON.stringify({
          type: 'complete',
          batchId: batchMeta.batchId,
          fileId: meta.id,
          isLastFile,
        })
      );

      // Small 50ms pause between files to give the receiver's disk/event loop time to process
      if (!isLastFile) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  private closePeer(socketId: string) {
    const dc = this.dataChannels.get(socketId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(socketId);
    }

    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }
  }

  public disconnect() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.socket.disconnect();
  }
}
