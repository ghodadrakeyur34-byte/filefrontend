import type { IceServerConfig } from '../../types/index.js';
import { API_URL } from '../config.js';
import type { SignalingClient } from './signaling.js';
import { DataChannelStreamer } from './dataChannel.js';

export interface PeerConnectionCallbacks {
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceCandidateTypeChange?: (type: 'direct-p2p' | 'turn-relay' | 'connecting') => void;
  onDataChannelReady?: (streamer: DataChannelStreamer) => void;
}

export class HyperBeamPeer {
  private pc: RTCPeerConnection | null = null;
  private signaling: SignalingClient;
  private targetPeerId: string | null = null;
  private streamer: DataChannelStreamer | null = null;
  private callbacks: PeerConnectionCallbacks = {};

  constructor(signaling: SignalingClient, callbacks: PeerConnectionCallbacks = {}) {
    this.signaling = signaling;
    this.callbacks = callbacks;
  }

  public async initialize(iceServers?: IceServerConfig[]): Promise<RTCPeerConnection> {
    let servers = iceServers;

    if (!servers || servers.length === 0) {
      try {
        const res = await fetch(`${API_URL}/api/ice-servers`);
        if (res.ok) {
          const data = await res.json();
          servers = data.iceServers;
        }
      } catch (err) {
        console.warn('Could not fetch dynamic ICE servers, using default Google STUN:', err);
      }
    }

    const defaultIce: RTCIceServer[] = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turns:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ];

    const rtcConfig: RTCConfiguration = {
      iceServers: (servers as RTCIceServer[]) || defaultIce,
      iceCandidatePoolSize: 4,
    };

    this.pc = new RTCPeerConnection(rtcConfig);

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.targetPeerId) {
        this.signaling.sendIceCandidate(event.candidate.toJSON(), this.targetPeerId);
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        const state = this.pc.connectionState;
        this.callbacks.onConnectionStateChange?.(state);
        this.checkCandidateType();
      }
    };

    this.pc.ondatachannel = (event) => {
      this.streamer = new DataChannelStreamer(event.channel);
      event.channel.onopen = () => {
        if (this.streamer) {
          this.callbacks.onDataChannelReady?.(this.streamer);
        }
      };
    };

    return this.pc;
  }

  public setTargetPeer(peerId: string): void {
    this.targetPeerId = peerId;
  }

  /**
   * Sender initializes the DataChannel and sends the SDP offer
   */
  public async createOffer(targetPeerId: string): Promise<DataChannelStreamer> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    this.targetPeerId = targetPeerId;

    const channel = this.pc.createDataChannel('hyperbeam-transfer', {
      ordered: true,
      maxRetransmits: 30,
    });

    this.streamer = new DataChannelStreamer(channel);

    channel.onopen = () => {
      if (this.streamer) {
        this.callbacks.onDataChannelReady?.(this.streamer);
      }
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.signaling.sendOffer(offer, targetPeerId);

    return this.streamer;
  }

  /**
   * Receiver handles the incoming SDP offer and returns an answer
   */
  public async handleOffer(offer: RTCSessionDescriptionInit, senderId: string): Promise<void> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    this.targetPeerId = senderId;

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signaling.sendAnswer(answer, senderId);
  }

  /**
   * Sender handles the incoming SDP answer
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Handles incoming ICE candidate
   */
  public async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Inspects active ICE stats to determine if direct P2P (srflx/host) or TURN relay is used
   */
  private async checkCandidateType(): Promise<void> {
    if (!this.pc) return;
    try {
      const stats = await this.pc.getStats();
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const remoteCandidate = stats.get(report.remoteCandidateId);
          if (remoteCandidate) {
            const isRelay = remoteCandidate.candidateType === 'relay';
            this.callbacks.onIceCandidateTypeChange?.(isRelay ? 'turn-relay' : 'direct-p2p');
          }
        }
      });
    } catch {
      // Stats may not be immediately available
    }
  }

  public getStreamer(): DataChannelStreamer | null {
    return this.streamer;
  }

  public close(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.streamer = null;
  }
}
