import React, { useState, useEffect, useRef } from 'react';
import type { TransferMode, TransferState, ChunkInfo, TransferTelemetry, TransferManifest } from './types/index.js';
import { Header } from './components/Header.js';
import { ModeSelector } from './components/ModeSelector.js';
import { DropZone } from './components/DropZone.js';
import { SpeedTelemetry } from './components/SpeedTelemetry.js';
import { ChunkMatrix } from './components/ChunkMatrix.js';
import { SecurityPanel } from './components/SecurityPanel.js';
import { ShareModal } from './components/ShareModal.js';
import { ReceiveCockpit } from './components/ReceiveCockpit.js';

import { generateEncryptionKey, exportKeyToBase64Url, encryptBuffer } from './lib/crypto.js';
import { computeFileSha256 } from './lib/hasher.js';
import { calculateOptimalChunkSize, generateChunkManifest, readChunkSlice } from './lib/chunker.js';
import { SpeedMonitor } from './lib/speedMonitor.js';
import { soundEffects } from './lib/audio.js';
import { SignalingClient } from './lib/webrtc/signaling.js';
import { HyperBeamPeer } from './lib/webrtc/peerConnection.js';
import { R2TransferEngine } from './lib/r2Uploader.js';
import { API_URL } from './lib/config.js';

import { Send, Share2, Shield, Zap } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [mode, setMode] = useState<TransferMode>('p2p');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transferState, setTransferState] = useState<TransferState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to stage transfer');

  // Encryption & Identity
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [keyAnchor, setKeyAnchor] = useState<string>('');
  const [sha256, setSha256] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Chunks and Telemetry
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | undefined>(undefined);
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

  // URL query check: Receiver Mode
  const [urlRoomId, setUrlRoomId] = useState<string>('');

  const signalingRef = useRef<SignalingClient | null>(null);
  const peerRef = useRef<HyperBeamPeer | null>(null);
  const speedMonitorRef = useRef<SpeedMonitor | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setActiveTab('receive');
      setUrlRoomId(room);
    }
  }, []);

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setTransferState('preparing');
    setStatusMessage('Generating client-side AES-256-GCM key...');

    const key = await generateEncryptionKey();
    const anchor = await exportKeyToBase64Url(key);
    setCryptoKey(key);
    setKeyAnchor(anchor);

    const generatedRoom = `HB-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setRoomId(generatedRoom);

    const chunkSize = calculateOptimalChunkSize(file.size);
    const chunkList = generateChunkManifest(file.size, chunkSize);
    setChunks(chunkList);

    speedMonitorRef.current = new SpeedMonitor(file.size);
    setTelemetry({
      bytesTransferred: 0,
      totalBytes: file.size,
      speedBps: 0,
      etaSeconds: 0,
      percent: 0,
      chunksCompleted: 0,
      totalChunks: chunkList.length,
      connectionState: 'staged',
      iceType: mode === 'p2p' ? 'connecting' : 'r2-edge',
      latencyMs: 0,
    });

    setStatusMessage('Payload partitioned. Calculating SHA-256 integrity hash...');

    computeFileSha256(file)
      .then((digest) => {
        setSha256(digest);
        setStatusMessage('Payload ready. Click Initiate Transfer to start.');
      })
      .catch((err) => console.warn('SHA-256 warning:', err));

    setShowShareModal(true);
    setTransferState('idle');
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setChunks([]);
    setCryptoKey(null);
    setKeyAnchor('');
    setSha256('');
    setRoomId('');
    setTransferState('idle');
    setStatusMessage('Ready to stage transfer');
  };

  const handleInitiateTransmission = async () => {
    if (!selectedFile || !cryptoKey) return;

    soundEffects.playLock();
    setTransferState('connecting');
    setStatusMessage('Registering transfer session...');

    const chunkSize = calculateOptimalChunkSize(selectedFile.size);
    const manifest: TransferManifest = {
      fileId: `payload_${Date.now()}`,
      roomId,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      totalChunks: chunks.length,
      chunkSize,
      sha256,
      mode,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    try {
      await fetch(`${API_URL}/api/session/manifest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manifest),
      });
    } catch (err) {
      console.warn('Backend REST manifest store error:', err);
    }

    if (mode === 'p2p') {
      const signaling = new SignalingClient();
      signalingRef.current = signaling;

      signaling.addListener((msg) => {
        if (msg.type === 'peer-joined') {
          setStatusMessage('Recipient connected! Starting WebRTC handshake...');
          startP2POffer(msg.senderId, manifest);
        } else if (msg.type === 'answer' && msg.payload) {
          peerRef.current?.handleAnswer((msg.payload as { sdp: RTCSessionDescriptionInit }).sdp);
        } else if (msg.type === 'ice-candidate' && msg.payload) {
          peerRef.current?.handleIceCandidate((msg.payload as { candidate: RTCIceCandidateInit }).candidate);
        }
      });

      await signaling.connect(roomId, 'sender');
      setStatusMessage('Waiting for recipient to connect...');
    } else {
      setTransferState('transferring');
      setStatusMessage('Uploading parallel encrypted chunks to Cloudflare R2...');

      try {
        await R2TransferEngine.uploadFile(
          selectedFile,
          chunks,
          cryptoKey,
          4,
          (progress) => {
            soundEffects.playChunk();
            speedMonitorRef.current?.recordProgress(progress.bytesUploaded);
            const speed = speedMonitorRef.current?.getInstantaneousSpeed() || 0;
            const eta = speedMonitorRef.current?.getEstimatedTimeRemainingSeconds() || 0;
            const percent = speedMonitorRef.current?.getPercent() || 0;

            setChunks((prev) =>
              prev.map((c) => (c.index === progress.chunkIndex ? { ...c, status: 'completed' } : c))
            );

            setTelemetry((prev) => ({
              ...prev,
              bytesTransferred: progress.bytesUploaded,
              chunksCompleted: prev.chunksCompleted + 1,
              speedBps: speed,
              etaSeconds: eta,
              percent,
              connectionState: 'uploading to R2 edge',
            }));
          }
        );

        soundEffects.playComplete();
        setTransferState('completed');
        setStatusMessage('Upload complete! The recipient can download anytime.');
      } catch (err) {
        soundEffects.playAlert();
        setTransferState('error');
        setStatusMessage(`Error: ${(err as Error).message}`);
      }
    }
  };

  const startP2POffer = async (receiverPeerId: string, manifest: TransferManifest) => {
    if (!signalingRef.current || !selectedFile || !cryptoKey) return;

    const peer = new HyperBeamPeer(signalingRef.current, {
      onConnectionStateChange: (st) => {
        setTelemetry((prev) => ({ ...prev, connectionState: st }));
      },
      onIceCandidateTypeChange: (iceType) => {
        setTelemetry((prev) => ({ ...prev, iceType }));
      },
      onDataChannelReady: async (streamer) => {
        setTransferState('transferring');
        setStatusMessage('Direct DataChannel active. Streaming chunks...');
        await streamFileToPeer(streamer);
      },
    });

    await peer.initialize();
    peerRef.current = peer;

    signalingRef.current.send({
      type: 'manifest',
      roomId,
      senderId: signalingRef.current.getPeerId(),
      targetId: receiverPeerId,
      payload: manifest,
      timestamp: Date.now(),
    });

    await peer.createOffer(receiverPeerId);
  };

  const streamFileToPeer = async (streamer: import('./lib/webrtc/dataChannel.js').DataChannelStreamer) => {
    if (!selectedFile || !cryptoKey) return;

    let bytesSentTotal = 0;

    for (let i = 0; i < chunks.length; i++) {
      setCurrentChunkIndex(i);
      setChunks((prev) => prev.map((c) => (c.index === i ? { ...c, status: 'active' } : c)));

      const rawSlice = await readChunkSlice(selectedFile, chunks[i]);
      const encryptedSlice = await encryptBuffer(rawSlice, cryptoKey);

      await streamer.sendChunk(i, chunks.length, encryptedSlice, (bytesSentInChunk) => {
        const currentBytes = bytesSentTotal + bytesSentInChunk;
        speedMonitorRef.current?.recordProgress(currentBytes);
        const speed = speedMonitorRef.current?.getInstantaneousSpeed() || 0;
        const eta = speedMonitorRef.current?.getEstimatedTimeRemainingSeconds() || 0;
        const percent = speedMonitorRef.current?.getPercent() || 0;

        setTelemetry((prev) => ({
          ...prev,
          bytesTransferred: currentBytes,
          speedBps: speed,
          etaSeconds: eta,
          percent,
        }));
      });

      bytesSentTotal += chunks[i].size;
      soundEffects.playChunk();

      setChunks((prev) => prev.map((c) => (c.index === i ? { ...c, status: 'completed' } : c)));
      setTelemetry((prev) => ({ ...prev, chunksCompleted: i + 1 }));
    }

    soundEffects.playComplete();
    setTransferState('completed');
    setStatusMessage('Transmission complete! File delivered directly to recipient.');
    setCurrentChunkIndex(undefined);
  };

  const shareUrl = roomId
    ? `${window.location.origin}/?room=${encodeURIComponent(roomId)}#key=${encodeURIComponent(keyAnchor)}`
    : '';

  const isTransferActive = transferState === 'transferring' || transferState === 'completed';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'send' && urlRoomId) {
            window.history.pushState({}, '', window.location.pathname);
            setUrlRoomId('');
          }
        }}
      />

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        {activeTab === 'receive' ? (
          <ReceiveCockpit
            roomId={urlRoomId}
            onReset={() => {
              window.history.pushState({}, '', window.location.pathname);
              setUrlRoomId('');
            }}
          />
        ) : (
          /* Send Mode - Focused Clean Card */
          <div style={{
            maxWidth: isTransferActive ? '800px' : '620px',
            width: '100%',
            transition: 'max-width var(--transition-normal)',
          }}>
            {/* Header Text */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                High-Speed Zero-Cost File Transfer
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
                Direct WebRTC peer streaming and Cloudflare R2 multi-part staging with client-side AES-256-GCM zero-knowledge encryption.
              </p>
            </div>

            {/* Central Transfer Card */}
            <div className="glass-card" style={{ padding: '28px' }}>
              {/* Transfer Mode Selector */}
              <ModeSelector
                mode={mode}
                onChange={setMode}
                disabled={transferState === 'transferring'}
              />

              {/* Drop Zone */}
              <DropZone
                onFileSelected={handleFileSelected}
                onClearFile={handleClearFile}
                selectedFile={selectedFile}
                disabled={transferState === 'transferring'}
              />

              {/* Staged File Action Bar */}
              {selectedFile && transferState !== 'completed' && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button
                    onClick={handleInitiateTransmission}
                    disabled={transferState === 'transferring'}
                    className="btn-primary"
                    style={{ flex: 1, padding: '14px 20px', fontSize: '14px' }}
                  >
                    <Send size={16} />
                    {transferState === 'transferring'
                      ? 'Streaming in Progress...'
                      : `Start Transfer (${mode === 'p2p' ? 'WebRTC P2P' : 'Cloudflare R2'})`}
                  </button>

                  {roomId && (
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="btn-secondary"
                      style={{ padding: '14px 18px', fontSize: '13px' }}
                      title="View Share Link"
                    >
                      <Share2 size={16} />
                      Share Link
                    </button>
                  )}
                </div>
              )}

              {/* Active Transfer Telemetry & Chunk Matrix */}
              {isTransferActive && (
                <div>
                  <SpeedTelemetry telemetry={telemetry} />
                  <ChunkMatrix chunks={chunks} currentChunkIndex={currentChunkIndex} />
                </div>
              )}

              {/* Status Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
              }}>
                <Zap size={14} color="var(--color-cta)" />
                <span>{statusMessage}</span>
              </div>

              {/* Security Guarantee Footer */}
              <SecurityPanel
                hasKey={Boolean(cryptoKey)}
                sha256={sha256}
                isVerified={Boolean(sha256)}
              />
            </div>

            {/* Zero Cost Trust Badges */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              marginTop: '24px',
              fontSize: '12px',
              color: 'var(--color-text-dim)',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} color="var(--color-cta)" />
                <span>Zero Cloud Storage (P2P Mode)</span>
              </div>
              <div>•</div>
              <div>Free Google STUN + Metered TURN</div>
              <div>•</div>
              <div>100% Client-Side Encryption</div>
            </div>
          </div>
        )}
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          shareUrl={shareUrl}
          roomId={roomId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Minimal Footer */}
      <footer style={{
        padding: '18px 24px',
        borderTop: '1px solid var(--color-border)',
        background: 'rgba(9, 13, 22, 0.8)',
        fontSize: '12px',
        color: 'var(--color-text-dim)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>HyperBeam Protocol • Zero-Cost Cloud Architecture Specification</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="https://github.com/ghodadrakeyur34-byte/filebackend" target="_blank" rel="noreferrer">
              Backend
            </a>
            <a href="https://github.com/ghodadrakeyur34-byte/filefrontend" target="_blank" rel="noreferrer">
              Frontend
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
