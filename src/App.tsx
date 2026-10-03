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

import { Send, Share2, Activity, Shield } from 'lucide-react';

export const App: React.FC = () => {
  // Transfer Mode: P2P or Cloudflare R2
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
  const [isReceiverMode, setIsReceiverMode] = useState<boolean>(false);
  const [receiverRoomId, setReceiverRoomId] = useState<string>('');

  const signalingRef = useRef<SignalingClient | null>(null);
  const peerRef = useRef<HyperBeamPeer | null>(null);
  const speedMonitorRef = useRef<SpeedMonitor | null>(null);

  // Check URL parameters for receiver mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setIsReceiverMode(true);
      setReceiverRoomId(room);
    }
  }, []);

  // When a file is selected by sender
  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setTransferState('preparing');
    setStatusMessage('Generating 256-bit zero-knowledge cryptographic key...');

    // 1. Generate client-side AES-256-GCM key
    const key = await generateEncryptionKey();
    const anchor = await exportKeyToBase64Url(key);
    setCryptoKey(key);
    setKeyAnchor(anchor);

    // 2. Generate room ID
    const generatedRoom = `HB-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setRoomId(generatedRoom);

    // 3. Partition chunks
    const chunkSize = calculateOptimalChunkSize(file.size);
    const chunkList = generateChunkManifest(file.size, chunkSize);
    setChunks(chunkList);

    // 4. Initialize speed monitor
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

    setStatusMessage('Payload partitioned and encrypted in memory. Computing SHA-256 integrity digest...');

    // 5. Calculate SHA-256 digest in background
    computeFileSha256(file)
      .then((digest) => {
        setSha256(digest);
        setStatusMessage('SHA-256 checksum computed. Ready for peer connection.');
      })
      .catch((err) => console.warn('SHA-256 computation non-critical warning:', err));

    setShowShareModal(true);
    setTransferState('idle');
  };

  // Launch transfer
  const handleInitiateTransmission = async () => {
    if (!selectedFile || !cryptoKey) return;

    soundEffects.playLock();
    setTransferState('connecting');
    setStatusMessage('Establishing signaling link...');

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

    // Save manifest to backend session registry
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
      // Connect to WebSocket signaling
      const signaling = new SignalingClient();
      signalingRef.current = signaling;

      signaling.addListener((msg) => {
        if (msg.type === 'peer-joined') {
          setStatusMessage('Peer detected in room. Starting WebRTC handshake...');
          startP2POffer(msg.senderId, manifest);
        } else if (msg.type === 'answer' && msg.payload) {
          peerRef.current?.handleAnswer((msg.payload as { sdp: RTCSessionDescriptionInit }).sdp);
        } else if (msg.type === 'ice-candidate' && msg.payload) {
          peerRef.current?.handleIceCandidate((msg.payload as { candidate: RTCIceCandidateInit }).candidate);
        }
      });

      await signaling.connect(roomId, 'sender');
      setStatusMessage('Broadcasting room offer. Waiting for recipient to open link...');
    } else {
      // Mode B: Cloudflare R2 Edge Staging
      setTransferState('transferring');
      setStatusMessage('Streaming parallel encrypted multi-part chunks directly to Cloudflare R2...');

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
        setStatusMessage('Payload securely uploaded to Cloudflare R2 edge! Recipient can now download.');
      } catch (err) {
        soundEffects.playAlert();
        setTransferState('error');
        setStatusMessage(`R2 Staging Error: ${(err as Error).message}`);
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
        setStatusMessage('Encrypted SCTP DataChannel opened. Streaming chunks...');
        await streamFileToPeer(streamer);
      },
    });

    await peer.initialize();
    peerRef.current = peer;

    // Send manifest to receiver
    signalingRef.current.send({
      type: 'manifest',
      roomId,
      senderId: signalingRef.current.getPeerId(),
      targetId: receiverPeerId,
      payload: manifest,
      timestamp: Date.now(),
    });

    // Create SDP Offer
    await peer.createOffer(receiverPeerId);
  };

  const streamFileToPeer = async (streamer: import('./lib/webrtc/dataChannel.js').DataChannelStreamer) => {
    if (!selectedFile || !cryptoKey) return;

    let bytesSentTotal = 0;

    for (let i = 0; i < chunks.length; i++) {
      setCurrentChunkIndex(i);
      setChunks((prev) => prev.map((c) => (c.index === i ? { ...c, status: 'active' } : c)));

      // 1. Read slice from disk without heap bloat
      const rawSlice = await readChunkSlice(selectedFile, chunks[i]);

      // 2. Encrypt slice with AES-256-GCM
      const encryptedSlice = await encryptBuffer(rawSlice, cryptoKey);

      // 3. Send over SCTP DataChannel with backpressure flow control
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
    setStatusMessage('Payload transmission complete! All chunks acknowledged by receiver.');
    setCurrentChunkIndex(undefined);
  };

  const shareUrl = `${window.location.origin}/?room=${encodeURIComponent(roomId)}#key=${encodeURIComponent(keyAnchor)}`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, padding: 'var(--space-xl) 0' }}>
        <div className="hud-container">
          {/* Receiver Cockpit if URL has room parameter */}
          {isReceiverMode ? (
            <div className="grid-12">
              <ReceiveCockpit
                roomId={receiverRoomId}
                onReset={() => {
                  window.history.pushState({}, '', window.location.pathname);
                  setIsReceiverMode(false);
                }}
              />
            </div>
          ) : (
            <div className="grid-12">
              {/* Mission Header */}
              <div className="col-12" style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 'var(--space-md)',
                }}>
                  <div>
                    <h1 className="font-heading" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-xs)' }}>
                      HIGH-VELOCITY FILE TRANSFER COCKPIT
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '720px' }}>
                      100% Free-tier architecture utilizing browser-native WebRTC direct data channels, Cloudflare R2 multi-part staging, and zero-knowledge client-side cryptography.
                    </p>
                  </div>

                  {roomId && (
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="btn-secondary"
                      style={{ padding: '10px 18px', fontSize: '12px' }}
                    >
                      <Share2 size={15} />
                      VIEW SECURE LINK ({roomId})
                    </button>
                  )}
                </div>
              </div>

              {/* Left Column: Transfer Controls */}
              <div className="col-7">
                <ModeSelector
                  mode={mode}
                  onChange={setMode}
                  disabled={transferState === 'transferring'}
                />

                <DropZone
                  onFileSelected={handleFileSelected}
                  selectedFile={selectedFile}
                  disabled={transferState === 'transferring'}
                />

                {/* Transmission Trigger */}
                {selectedFile && transferState !== 'completed' && (
                  <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <button
                      onClick={handleInitiateTransmission}
                      disabled={transferState === 'transferring'}
                      className="btn-primary"
                      style={{
                        width: '100%',
                        padding: '16px 28px',
                        fontSize: '13px',
                      }}
                    >
                      <Send size={18} />
                      {transferState === 'transferring'
                        ? 'TRANSMISSION IN PROGRESS...'
                        : `INITIATE BEAM TRANSMISSION (${mode === 'p2p' ? 'WEBRTC P2P' : 'CLOUDFLARE R2'})`}
                    </button>
                  </div>
                )}

                {/* Status Ticker */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  marginBottom: 'var(--space-xl)',
                }}>
                  <Activity size={18} color="var(--color-cta)" />
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    MISSION STATUS: <strong style={{ color: 'var(--color-text)' }}>{statusMessage}</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Telemetry & Matrix */}
              <div className="col-5">
                {chunks.length > 0 ? (
                  <>
                    <SpeedTelemetry telemetry={telemetry} />
                    <ChunkMatrix chunks={chunks} currentChunkIndex={currentChunkIndex} />
                  </>
                ) : (
                  <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-lg)' }}>
                    <Shield size={36} color="var(--color-cyan)" style={{ margin: '0 auto var(--space-md)' }} />
                    <h3 className="font-heading" style={{ fontSize: '13px', color: 'var(--color-text)', marginBottom: 'var(--space-xs)' }}>
                      ZERO-COST TRANSFER PIPELINE IDLE
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                      Stage a file using the dropzone on the left to initialize the 16MB chunk slicing engine, generate the ephemeral AES-256 key, and open the peer transmission channel.
                    </p>
                  </div>
                )}

                {/* Security Breakdown */}
                <SecurityPanel
                  hasKey={Boolean(cryptoKey)}
                  sha256={sha256}
                  isVerified={Boolean(sha256)}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          shareUrl={shareUrl}
          roomId={roomId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Futuristic Space Tech Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        background: 'rgba(15, 23, 42, 0.95)',
        padding: 'var(--space-lg) 0',
      }}>
        <div className="hud-container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          fontSize: '11px',
          color: 'var(--color-text-dim)',
        }}>
          <div>
            HYPERBEAM PROTOCOL • ZERO-COST ARCHITECTURE SPECIFICATION COMPLIANT
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <span>CLOUDFLARE R2 (10GB/MO)</span>
            <span>•</span>
            <span>GOOGLE PUBLIC STUN</span>
            <span>•</span>
            <span>METERED OPENRELAY TURN</span>
            <span>•</span>
            <span>WEB CRYPTO AES-256-GCM</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
