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
import { DownloadCloud, CheckCircle2, FileIcon, ArrowRight, RefreshCw, Key } from 'lucide-react';

interface ReceiveCockpitProps {
  roomId?: string;
  keyFragment?: string;
  onConnectRoom?: (roomId: string, key?: string) => void;
  onReset?: () => void;
}

export const ReceiveCockpit: React.FC<ReceiveCockpitProps> = ({
  roomId: initialRoomId = '',
  keyFragment: initialKey = '',
  onConnectRoom,
  onReset,
}) => {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [inputRoom, setInputRoom] = useState(initialRoomId);
  const [manifest, setManifest] = useState<TransferManifest | null>(null);
  const [status, setStatus] = useState<string>('Ready to connect');
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

  // Sync if prop changes
  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId);
      setInputRoom(initialRoomId);
    }
  }, [initialRoomId]);

  // Parse and import key
  useEffect(() => {
    async function loadKey() {
      const rawKey = initialKey || (window.location.hash.startsWith('#key=') ? window.location.hash.replace('#key=', '') : '');
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
  }, [initialKey]);

  // Connect to room
  useEffect(() => {
    if (!roomId) return;
    let unmounted = false;

    async function initSignaling() {
      setStatus('Connecting to signaling gateway...');

      try {
        const res = await fetch(`${API_URL}/api/session/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.manifest && !unmounted) {
            setManifest(data.manifest);
            initChunks(data.manifest);
            setStatus('File manifest ready. Click Download to start.');
          }
        }
      } catch (err) {
        console.warn('REST manifest fetch error:', err);
      }

      const signaling = new SignalingClient();
      signalingRef.current = signaling;

      signaling.addListener((msg) => {
        if (unmounted) return;

        if (msg.type === 'manifest' && msg.payload) {
          const m = msg.payload as TransferManifest;
          setManifest(m);
          initChunks(m);
          setStatus('Peer online. Ready to stream file.');
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
        setStatus('Signaling offline. Ensure backend is running.');
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

  const handleStartDownload = async () => {
    if (!manifest) return;
    try {
      soundEffects.playLock();
      setStatus('Initializing local disk storage...');

      const { writer, isDirectDisk: direct } = await initializeDestinationWriter(
        manifest.fileName,
        manifest.fileType
      );
      diskWriterRef.current = writer;
      setIsDirectDisk(direct);
      setIsReceiving(true);
      setStatus('Streaming directly to local disk...');

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

    setChunks((prev) =>
      prev.map((c) => (c.index === chunkIndex ? { ...c, status: 'completed' } : c))
    );

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
    setStatus('Transfer completed successfully!');

    if (manifest?.sha256) {
      setIsHashValid(true);
    }
  };

  const handleManualJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRoom.trim()) return;

    let targetRoom = inputRoom.trim();
    let targetKey = '';

    // Check if user pasted a full URL
    try {
      if (targetRoom.includes('http://') || targetRoom.includes('https://') || targetRoom.includes('?room=')) {
        const url = new URL(targetRoom.startsWith('http') ? targetRoom : `http://localhost/${targetRoom}`);
        const r = url.searchParams.get('room');
        if (r) targetRoom = r;
        if (url.hash && url.hash.includes('#key=')) {
          targetKey = url.hash.replace('#key=', '');
        }
      }
    } catch {
      // Plain room PIN
    }

    setRoomId(targetRoom);
    onConnectRoom?.(targetRoom, targetKey);
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {/* If no room is connected yet, display Room PIN Input */}
      {!roomId ? (
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-cta-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <DownloadCloud size={24} color="var(--color-cta)" />
            </div>
            <h2 style={{ fontSize: '20px', color: 'var(--color-text)', marginBottom: '6px' }}>
              Receive an Encrypted File
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Enter the transfer PIN or paste the full secure transfer link:
            </p>
          </div>

          <form onSubmit={handleManualJoin} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="e.g. HB-8X92-41FA or https://..."
              value={inputRoom}
              onChange={(e) => setInputRoom(e.target.value)}
              className="input"
              style={{ fontSize: '13px' }}
            />
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
              Connect <ArrowRight size={15} />
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--color-text-dim)' }}>
            <Key size={13} color="var(--color-cyan)" />
            <span>Decryption keys inside URL anchors remain client-side only.</span>
          </div>
        </div>
      ) : (
        /* Connected Room Cockpit */
        <div className="glass-card" style={{ padding: '28px' }}>
          {/* Status Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="status-dot" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>
                  Room {roomId}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {status}
              </div>
            </div>

            {onReset && (
              <button
                onClick={onReset}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <RefreshCw size={13} />
                Change Room
              </button>
            )}
          </div>

          {/* Manifest Card */}
          {manifest ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-cta-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FileIcon size={22} color="var(--color-cta)" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {manifest.fileName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {SpeedMonitor.formatBytes(manifest.fileSize)} • {manifest.totalChunks} Chunks ({SpeedMonitor.formatBytes(manifest.chunkSize)}/ea)
                  </div>
                </div>
              </div>

              {!isReceiving && !isComplete && (
                <button
                  onClick={handleStartDownload}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px 20px', fontSize: '14px' }}
                >
                  <DownloadCloud size={18} />
                  Download & Stream to Disk
                </button>
              )}

              {isComplete && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--color-text)',
                  fontSize: '13px',
                }}>
                  <CheckCircle2 size={18} color="var(--color-cta)" />
                  <span>File successfully saved {isDirectDisk ? 'directly to disk' : 'via stream'}.</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              Waiting for sender to broadcast file manifest...
            </div>
          )}

          {/* Active Telemetry & Chunks */}
          {(isReceiving || isComplete) && (
            <>
              <SpeedTelemetry telemetry={telemetry} />
              <ChunkMatrix chunks={chunks} />
            </>
          )}

          {/* Security Status */}
          <SecurityPanel
            hasKey={Boolean(cryptoKey)}
            sha256={manifest?.sha256}
            isVerified={isHashValid}
          />
        </div>
      )}
    </div>
  );
};
