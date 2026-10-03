import type { SignalingMessage } from '../../types/index.js';
import { WS_URL } from '../config.js';

export type SignalingListener = (message: SignalingMessage) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private listeners: Set<SignalingListener> = new Set();
  private roomId: string = '';
  private peerId: string = '';
  private role: 'sender' | 'receiver' = 'receiver';
  private pingInterval: number | null = null;
  private isExplicitlyClosed: boolean = false;

  constructor() {
    this.peerId = `peer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  public getPeerId(): string {
    return this.peerId;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public connect(roomId: string, role: 'sender' | 'receiver'): Promise<void> {
    this.roomId = roomId;
    this.role = role;
    this.isExplicitlyClosed = false;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log(`[Signaling] Connected to ${WS_URL} for room ${roomId}`);
          this.send({
            type: 'join',
            roomId: this.roomId,
            senderId: this.peerId,
            payload: { role: this.role },
            timestamp: Date.now(),
          });

          // Start ping heartbeat every 15s
          this.pingInterval = window.setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.send({
                type: 'ping',
                roomId: this.roomId,
                senderId: this.peerId,
                timestamp: Date.now(),
              });
            }
          }, 15000);

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            this.listeners.forEach((listener) => listener(message));
          } catch (err) {
            console.error('[Signaling] Failed to parse message:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[Signaling] WebSocket error:', err);
        };

        this.ws.onclose = () => {
          console.log('[Signaling] WebSocket connection closed');
          if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
          }
          if (!this.isExplicitlyClosed) {
            // Auto reconnect after 3 seconds
            setTimeout(() => {
              if (!this.isExplicitlyClosed && this.roomId) {
                this.connect(this.roomId, this.role).catch(() => {});
              }
            }, 3000);
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public send(message: SignalingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public sendOffer(sdp: RTCSessionDescriptionInit, targetId?: string): void {
    this.send({
      type: 'offer',
      roomId: this.roomId,
      senderId: this.peerId,
      targetId,
      payload: { sdp },
      timestamp: Date.now(),
    });
  }

  public sendAnswer(sdp: RTCSessionDescriptionInit, targetId?: string): void {
    this.send({
      type: 'answer',
      roomId: this.roomId,
      senderId: this.peerId,
      targetId,
      payload: { sdp },
      timestamp: Date.now(),
    });
  }

  public sendIceCandidate(candidate: RTCIceCandidateInit, targetId?: string): void {
    this.send({
      type: 'ice-candidate',
      roomId: this.roomId,
      senderId: this.peerId,
      targetId,
      payload: { candidate },
      timestamp: Date.now(),
    });
  }

  public addListener(listener: SignalingListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.send({
        type: 'leave',
        roomId: this.roomId,
        senderId: this.peerId,
        timestamp: Date.now(),
      });
      this.ws.close();
      this.ws = null;
    }
  }
}
