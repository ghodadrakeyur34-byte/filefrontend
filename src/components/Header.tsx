import React, { useState } from 'react';
import { soundEffects } from '../lib/audio.js';
import { Volume2, VolumeX, Shield, Radio } from 'lucide-react';

export const Header: React.FC = () => {
  const [audioEnabled, setAudioEnabled] = useState(soundEffects.isEnabled());

  const handleToggleAudio = () => {
    const next = soundEffects.toggle();
    setAudioEnabled(next);
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--color-border)',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="hud-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 'var(--space-md)',
        paddingBottom: 'var(--space-md)',
        flexWrap: 'wrap',
        gap: 'var(--space-md)',
      }}>
        {/* Brand & Mission Mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            border: '1px solid var(--color-cta)',
            boxShadow: 'var(--shadow-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-cta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span className="font-heading" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
                HYPER<span style={{ color: 'var(--color-cta)' }}>BEAM</span>
              </span>
              <span className="badge badge-green" style={{ fontSize: '10px' }}>v1.0 FREE TIER</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>
              ZERO-COST AEROSPACE P2P & R2 TRANSFER PROTOCOL
            </div>
          </div>
        </div>

        {/* Global Telemetry Beacon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid var(--color-border)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
          }}>
            <span className="beacon" />
            <span style={{ color: 'var(--color-text-muted)' }}>NETWORK:</span>
            <span style={{ color: 'var(--color-cta)', fontWeight: 700 }}>GOOGLE STUN + OPENRELAY TURN</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid var(--color-border)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
          }}>
            <Shield size={13} color="var(--color-cyan)" />
            <span style={{ color: 'var(--color-text-muted)' }}>CRYPTO:</span>
            <span style={{ color: 'var(--color-cyan)', fontWeight: 700 }}>AES-256-GCM ZERO-KNOWLEDGE</span>
          </div>

          {/* Audio Synthesizer Toggle */}
          <button
            onClick={handleToggleAudio}
            className="btn-icon"
            title={audioEnabled ? 'Mute Cyber Audio' : 'Enable Cyber Audio'}
            aria-label="Toggle Audio"
          >
            {audioEnabled ? <Volume2 size={16} color="var(--color-cta)" /> : <VolumeX size={16} color="var(--color-text-dim)" />}
          </button>

          {/* GitHub Repositories */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <a
              href="https://github.com/ghodadrakeyur34-byte/filebackend"
              target="_blank"
              rel="noreferrer"
              className="btn-icon"
              title="Backend Repository (Cloudflare Worker & WebSocket Relay)"
              aria-label="Backend Repo"
            >
              <Radio size={16} />
            </a>
            <a
              href="https://github.com/ghodadrakeyur34-byte/filefrontend"
              target="_blank"
              rel="noreferrer"
              className="btn-icon"
              title="Frontend Repository (Vite + WebRTC HUD)"
              aria-label="Frontend Repo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
