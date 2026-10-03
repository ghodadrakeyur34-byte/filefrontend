export type TransferMode = 'p2p' | 'r2';
export type TransferRole = 'sender' | 'receiver';

export type TransferState =
  | 'idle'
  | 'preparing'
  | 'encrypting'
  | 'connecting'
  | 'transferring'
  | 'verifying'
  | 'completed'
  | 'error';

export type ChunkStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
  status: ChunkStatus;
  progress?: number;
}

export interface TransferManifest {
  fileId: string;
  roomId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  chunkSize: number;
  sha256?: string;
  mode: TransferMode;
  createdAt: number;
  expiresAt: number;
}

export interface TransferTelemetry {
  bytesTransferred: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number;
  percent: number;
  chunksCompleted: number;
  totalChunks: number;
  connectionState: string;
  iceType: 'direct-p2p' | 'turn-relay' | 'r2-edge' | 'connecting';
  latencyMs: number;
}

export type SignalingMessageType =
  | 'join'
  | 'leave'
  | 'peer-joined'
  | 'peer-left'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'room-status'
  | 'manifest'
  | 'ping'
  | 'pong'
  | 'error';

export interface SignalingMessage<T = unknown> {
  type: SignalingMessageType;
  roomId: string;
  senderId: string;
  targetId?: string;
  payload?: T;
  timestamp: number;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}
