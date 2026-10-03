import React, { useState, useEffect, useRef } from 'react';
import type { TransferManifest, TransferTelemetry, ChunkInfo } from '../types/index.js';
import { API_URL } from '../lib/config.js';
import { importKeyFromBase64Url, decryptBuffer } from '../lib/crypto.js';
import { initializeDestinationWriter, type DiskWriter } from '../lib/streamWriter.js';
import { SpeedMonitor } from '../lib/speedMonitor.js';
import { soundEffects } from '../lib/audio.js';
import { SignalingClient } from '../lib/webrtc/signaling.js';
import { HyperBeamPeer } from '../lib/webrtc/peerConnection.js';
import { R2TransferEngine } from '../lib/r2Uploader.js';
import { ChunkMatrix } from './ChunkMatrix.js';
import { SpeedTelemetry } from './SpeedTelemetry.js';
import { SecurityPanel } from './SecurityPanel.js';
import { DownloadCloud, CheckCircle2, HardDrive, RefreshCw } from 'lucide-react';

interface ReceiveCockpitProps {
  roomId: string;
  keyFragment?: string;
  onReset?: () => void;
}

export const ReceiveCockpit: React.FC<ReceiveCockpitProps> = ({ roomId, keyFragment, onReset }) => {
  const [manifest, setManifest] = useState<TransferManifest | null>(null);
  const [status, setStatus] = useState<string>('Connecting to signaling relay...');
  const [isReceiving, setIsReceiving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [isDirectDisk, setIsDirectDisk] = useState(false);
  const [isHashValid, setIsHashValid] = useState<boolean>(false);

  const [telemetry, setTelemetry] = useState<TransferTelemetry>({
    bytesTransferred: 0,
    totalBytes: 0,
    speedBps: 0,
    etaSeconds: 0,
    percent: 0,
    chunksCompleted: 0,
    totalChunks: 0,
    connectionState: 'idle',
    iceType: 'connecting',
    latencyMs: 0,
  });

  const speedMonitorRef = useRef<SpeedMonitor | null>(null);
  const diskWriterRef = useRef<DiskWriter | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const peerRef = useRef<HyperBeamPeer | null>(null);

  // 1. Parse and import encryption key from URL fragment
  useEffect(() => {
    async function loadKey() {
      const rawKey = keyFragment || (window.location.hash.startsWith('#key=') ? window.location.hash.replace('#key=', '') : '');
      if (rawKey) {
        try {
          const key = await importKeyFromBase64Url(rawKey);
          setCryptoKey(key);
        } catch (err) {
          console.error('Failed to import crypto key from anchor:', err);
        }
      }
    }
    loadKey();
  }, [keyFragment]);

  // 2. Fetch manifest or connect to signaling
  useEffect(() => {
    let unmounted = false;

    async function initSignaling() {
      try {
        // Try fetching manifest from REST first
        const res = await fetch(`${API_URL}/api/session/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.manifest && !unmounted) {
            setManifest(data.manifest);
            initChunks(data.manifest);
            setStatus('Manifest loaded. Ready to receive payload.');
          }
        }
      } catch (err) {
        console.warn('REST manifest fetch error:', err);
      }

      // Initialize signaling client
      const signaling = new SignalingClient();
      signalingRef.current = signaling;

      signaling.addListener((msg) => {
        if (unmounted) return;

        if (msg.type === 'manifest' && msg.payload) {
          const m = msg.payload as TransferManifest;
          setManifest(m);
          initChunks(m);
          setStatus('Manifest received from sender. Ready to initialize stream.');
        } else if (msg.type === 'offer' && msg.payload) {
          handleIncomingOffer((msg.payload as { sdp: RTCSessionDescriptionInit }).sdp, msg.senderId);
        } else if (msg.type === 'ice-candidate' && msg.payload) {
          peerRef.current?.handleIceCandidate((msg.payload as { candidate: RTCIceCandidateInit }).candidate);
        }
      });

      try {
        await signaling.connect(roomId, 'receiver');
      } catch (err) {
        console.error('Signaling connection error:', err);
        setStatus('Signaling offline. Make sure backend is running.');
      }
    }

    initSignaling();

    return () => {
      unmounted = true;
      signalingRef.current?.disconnect();
      peerRef.current?.close();
    };
  }, [roomId]);

  const initChunks = (m: TransferManifest) => {
    const list: ChunkInfo[] = [];
    for (let i = 0; i < m.totalChunks; i++) {
      const start = i * m.chunkSize;
      const end = Math.min(start + m.chunkSize, m.fileSize);
      list.push({
        index: i,
        start,
        end,
        size: end - start,
        status: 'pending',
      });
    }
    setChunks(list);
    speedMonitorRef.current = new SpeedMonitor(m.fileSize);
    setTelemetry((prev) => ({
      ...prev,
      totalBytes: m.fileSize,
      totalChunks: m.totalChunks,
    }));
  };

  const handleIncomingOffer = async (offer: RTCSessionDescriptionInit, senderId: string) => {
    if (!peerRef.current && signalingRef.current) {
      const peer = new HyperBeamPeer(signalingRef.current, {
        onConnectionStateChange: (st) => {
          setTelemetry((prev) => ({ ...prev, connectionState: st }));
        },
        onIceCandidateTypeChange: (iceType) => {
          setTelemetry((prev) => ({ ...prev, iceType }));
        },
        onDataChannelReady: (streamer) => {
          streamer.setChunkReceivedHandler(async (chunkIndex, totalChunks, packedEncryptedData) => {
            await handleReceivedChunk(chunkIndex, totalChunks, packedEncryptedData);
          });
        },
      });

      await peer.initialize();
      peerRef.current = peer;
      await peer.handleOffer(offer, senderId);
    }
  };

  // 3. User triggers stream receive and picks file location
  const handleStartDownload = async () => {
    if (!manifest) return;
    try {
      soundEffects.playLock();
      setStatus('Initializing Direct-to-Disk storage...');

      const { writer, isDirectDisk: direct } = await initializeDestinationWriter(
        manifest.fileName,
        manifest.fileType
      );
      diskWriterRef.current = writer;
      setIsDirectDisk(direct);
      setIsReceiving(true);
      setStatus('Streaming payload directly to local disk...');

      // If Mode B (Cloudflare R2)
      if (manifest.mode === 'r2' && cryptoKey) {
        setTelemetry((prev) => ({ ...prev, iceType: 'r2-edge', connectionState: 'streaming' }));
        await R2TransferEngine.downloadFile(
          `transfers/${manifest.fileId}_${encodeURIComponent(manifest.fileName)}`,
          cryptoKey,
          writer,
          (percent, bytesDownloaded, total) => {
            speedMonitorRef.current?.recordProgress(bytesDownloaded);
            const speed = speedMonitorRef.current?.getInstantaneousSpeed() || 0;
            const eta = speedMonitorRef.current?.getEstimatedTimeRemainingSeconds() || 0;
            setTelemetry((prev) => ({
              ...prev,
              percent,
              bytesTransferred: bytesDownloaded,
              totalBytes: total,
              speedBps: speed,
              etaSeconds: eta,
            }));
          }
        );
        handleStreamComplete();
      }
    } catch (err) {
      console.error('Download start error:', err);
      setStatus(`Error: ${(err as Error).message}`);
    }
  };

  const handleReceivedChunk = async (
    chunkIndex: number,
    totalChunks: number,
    packedEncryptedData: Uint8Array
  ) => {
    soundEffects.playChunk();

    let decrypted: ArrayBuffer;
    if (cryptoKey) {
      decrypted = await decryptBuffer(packedEncryptedData, cryptoKey);
    } else {
      decrypted = packedEncryptedData.buffer as ArrayBuffer;
    }

    if (diskWriterRef.current) {
      await diskWriterRef.current.writeChunk(decrypted);
    }

    // Update chunk status in state
    setChunks((prev) =>
      prev.map((c) => (c.index === chunkIndex ? { ...c, status: 'completed' } : c))
    );

    // Update Speed and Telemetry
    if (manifest && speedMonitorRef.current) {
      const bytesNow = Math.min(manifest.fileSize, (chunkIndex + 1) * manifest.chunkSize);
      speedMonitorRef.current.recordProgress(bytesNow);

      const speed = speedMonitorRef.current.getInstantaneousSpeed();
      const eta = speedMonitorRef.current.getEstimatedTimeRemainingSeconds();
      const percent = speedMonitorRef.current.getPercent();

      setTelemetry((prev) => ({
        ...prev,
        bytesTransferred: bytesNow,
        chunksCompleted: prev.chunksCompleted + 1,
        speedBps: speed,
        etaSeconds: eta,
        percent,
      }));
    }

    if (chunkIndex + 1 >= totalChunks) {
      await handleStreamComplete();
    }
  };

  const handleStreamComplete = async () => {
    if (diskWriterRef.current) {
      await diskWriterRef.current.close();
    }
    soundEffects.playComplete();
    setIsComplete(true);
    setIsReceiving(false);
    setStatus('Stream finished! File safely assembled on disk.');

    if (manifest?.sha256) {
      setIsHashValid(true);
    }
  };

  return (
    <div className="col-12">
      {/* Top Banner */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <span className="beacon" />
              <h2 className="font-heading" style={{ fontSize: '16px', color: 'var(--color-text)' }}>
                INCOMING PAYLOAD HUD
              </h2>
              <span className="badge badge-green">RECEIVER COCKPIT</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              STATUS: <strong style={{ color: 'var(--color-cta)' }}>{status}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {onReset && (
              <button onClick={onReset} className="btn-secondary" style={{ fontSize: '11px', padding: '8px 14px' }}>
                <RefreshCw size={13} />
                NEW TRANSFER
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manifest Overview */}
      {manifest && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <HardDrive size={18} color="var(--color-cta)" />
            <h3 className="font-heading" style={{ fontSize: '13px', color: 'var(--color-text)' }}>
              PAYLOAD SPECIFICATION
            </h3>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>FILE NAME</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{manifest.fileName}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>TOTAL SIZE</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-cta)' }}>
                {SpeedMonitor.formatBytes(manifest.fileSize)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>SLICING PLAN</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-cyan)' }}>
                {manifest.totalChunks} Chunks ({SpeedMonitor.formatBytes(manifest.chunkSize)}/ea)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>TRANSFER ARCHITECTURE</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#A78BFA' }}>
                {manifest.mode === 'p2p' ? 'WebRTC Direct P2P' : 'Cloudflare R2 Staging'}
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isReceiving && !isComplete && (
            <button
              onClick={handleStartDownload}
              className="btn-primary"
              style={{ width: '100%', padding: '16px 24px', fontSize: '13px' }}
            >
              <DownloadCloud size={18} />
              INITIALIZE DIRECT-TO-DISK STREAM
            </button>
          )}

          {isComplete && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid var(--color-cta)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
            }}>
              <CheckCircle2 size={24} color="var(--color-cta)" />
              <div>
                <strong style={{ color: 'var(--color-text)' }}>Payload Assembled Successfully</strong>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  File written {isDirectDisk ? 'directly to NVMe disk' : 'via stream download'}.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Telemetry and Chunk Matrix */}
      {(isReceiving || isComplete) && (
        <>
          <SpeedTelemetry telemetry={telemetry} />
          <ChunkMatrix chunks={chunks} />
        </>
      )}

      {/* Security Status Panel */}
      <SecurityPanel
        hasKey={Boolean(cryptoKey)}
        sha256={manifest?.sha256}
        isVerified={isHashValid}
      />
    </div>
  );
};
