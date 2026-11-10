import { io, Socket } from 'socket.io-client';
import type { FileMeta, Peer, TransferProgress } from '../types';
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

  // Receiving file states
  private receivingFiles = new Map<
    string,
    {
      meta: FileMeta;
      chunks: ArrayBuffer[];
      bytesReceived: number;
      startTime: number;
    }
  >();

  // Event callbacks
  public onPeersUpdate?: (peers: Peer[]) => void;
  public onPeerJoined?: (peer: Peer) => void;
  public onPeerLeft?: (socketId: string) => void;
  public onProgress?: (progress: TransferProgress) => void;
  public onFileReceived?: (fileName: string, blob: Blob) => void;
  public onIncomingRequest?: (senderSocketId: string, fileMeta: FileMeta) => void;
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

    // File transfer prompts
    this.socket.on('transfer-request', ({ senderSocketId, fileMeta }: { senderSocketId: string; fileMeta: FileMeta }) => {
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
          this.receivingFiles.set(meta.id, {
            meta,
            chunks: [],
            bytesReceived: 0,
            startTime: Date.now(),
          });

          if (this.onProgress) {
            this.onProgress({
              fileId: meta.id,
              fileName: meta.name,
              fileSize: meta.size,
              progress: 0,
              bytesTransferred: 0,
              speed: '0 B/s',
              type: 'receiving',
              status: 'transferring',
            });
          }
        } else if (message.type === 'complete') {
          const fileData = this.receivingFiles.get(message.fileId);
          if (fileData) {
            const blob = new Blob(fileData.chunks, { type: fileData.meta.type || 'application/octet-stream' });

            if (this.onProgress) {
              this.onProgress({
                fileId: fileData.meta.id,
                fileName: fileData.meta.name,
                fileSize: fileData.meta.size,
                progress: 100,
                bytesTransferred: fileData.meta.size,
                speed: 'Done',
                type: 'receiving',
                status: 'completed',
              });
            }

            if (this.onFileReceived) {
              this.onFileReceived(fileData.meta.name, blob);
            }

            this.receivingFiles.delete(message.fileId);
          }
        }
      } catch (err) {
        console.error('Error parsing JSON message on data channel:', err);
      }
    } else if (data instanceof ArrayBuffer) {
      // Find the active receiving file (last added)
      const activeFile = Array.from(this.receivingFiles.values())[0];
      if (activeFile) {
        activeFile.chunks.push(data);
        activeFile.bytesReceived += data.byteLength;

        const progressPercent = Math.min(100, Math.round((activeFile.bytesReceived / activeFile.meta.size) * 100));
        const timeElapsed = (Date.now() - activeFile.startTime) / 1000 || 1;
        const bytesPerSec = activeFile.bytesReceived / timeElapsed;
        const speedFormatted = `${formatBytes(bytesPerSec)}/s`;

        if (this.onProgress) {
          this.onProgress({
            fileId: activeFile.meta.id,
            fileName: activeFile.meta.name,
            fileSize: activeFile.meta.size,
            progress: progressPercent,
            bytesTransferred: activeFile.bytesReceived,
            speed: speedFormatted,
            type: 'receiving',
            status: progressPercent === 100 ? 'completed' : 'transferring',
          });
        }
      }
    }
  }

  // Request to send file
  public requestSendFile(targetSocketId: string, file: File) {
    const meta: FileMeta = {
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
    };

    this.socket.emit('transfer-request', {
      targetSocketId,
      fileMeta: meta,
    });

    return meta;
  }

  public respondTransfer(targetSocketId: string, accepted: boolean) {
    this.socket.emit('transfer-response', {
      targetSocketId,
      accepted,
    });
  }

  // Send file chunks with Backpressure Control
  public async sendFile(targetSocketId: string, file: File, meta: FileMeta) {
    const dc = this.dataChannels.get(targetSocketId);
    if (!dc || dc.readyState !== 'open') {
      throw new Error('Data Channel is not open. Cannot transfer file.');
    }

    // 1. Send Header
    dc.send(JSON.stringify({ type: 'header', meta }));

    const startTime = Date.now();
    let offset = 0;
    let bytesSent = 0;

    // Set buffer threshold for backpressure (64 KB)
    dc.bufferedAmountLowThreshold = 65536;

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
      bytesSent += buffer.byteLength;

      const progressPercent = Math.min(100, Math.round((bytesSent / file.size) * 100));
      const timeElapsed = (Date.now() - startTime) / 1000 || 1;
      const bytesPerSec = bytesSent / timeElapsed;
      const speedFormatted = `${formatBytes(bytesPerSec)}/s`;

      if (this.onProgress) {
        this.onProgress({
          fileId: meta.id,
          fileName: file.name,
          fileSize: file.size,
          progress: progressPercent,
          bytesTransferred: bytesSent,
          speed: speedFormatted,
          type: 'sending',
          status: progressPercent === 100 ? 'completed' : 'transferring',
        });
      }
    }

    // 2. Send Complete packet
    dc.send(JSON.stringify({ type: 'complete', fileId: meta.id }));
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
