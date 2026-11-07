export interface Peer {
  socketId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  roomId: string;
}

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

export interface TransferProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  progress: number; // 0 to 100
  bytesTransferred: number;
  speed: string; // e.g. "14.2 MB/s"
  type: 'sending' | 'receiving';
  status: 'pending' | 'transferring' | 'completed' | 'cancelled' | 'error';
}

export interface PacketHeader {
  type: 'header';
  meta: FileMeta;
}

export interface PacketChunk {
  type: 'chunk';
  fileId: string;
  chunkIndex: number;
}

export interface PacketComplete {
  type: 'complete';
  fileId: string;
}
