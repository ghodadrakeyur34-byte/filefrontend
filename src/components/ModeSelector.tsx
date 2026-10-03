import React from 'react';
import type { TransferMode } from '../types/index.js';
import { Zap, Cloud, Check } from 'lucide-react';
import { soundEffects } from '../lib/audio.js';

interface ModeSelectorProps {
  mode: TransferMode;
  onChange: (mode: TransferMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, onChange, disabled }) => {
  const handleSelect = (nextMode: TransferMode) => {
    if (disabled || nextMode === mode) return;
    soundEffects.playBeep(1100, 0.05);
    onChange(nextMode);
  };

  return (
    <div style={{ marginBottom: 'var(--space-xl)' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-sm)',
      }}>
        <label className="font-heading" style={{ fontSize: '11px', color: 'var(--color-text-dim)', letterSpacing: '0.1em' }}>
          TRANSFER PIPELINE ARCHITECTURE (100% FREE TIER)
        </label>
        <span style={{ fontSize: '11px', color: 'var(--color-cta)' }}>
          {mode === 'p2p' ? 'ZERO CLOUD STORAGE CONSUMED' : 'CLOUDFLARE R2 EDGE STORAGE (10GB FREE)'}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 'var(--space-md)',
      }}>
        {/* Mode A: WebRTC P2P */}
        <div
          onClick={() => handleSelect('p2p')}
          className="card"
          style={{
            cursor: disabled ? 'not-allowed' : 'pointer',
            borderColor: mode === 'p2p' ? 'var(--color-cta)' : 'var(--color-border)',
            background: mode === 'p2p' ? 'rgba(34, 197, 94, 0.06)' : 'var(--color-surface-card)',
            boxShadow: mode === 'p2p' ? '0 0 20px rgba(34, 197, 94, 0.15)' : 'none',
            padding: 'var(--space-md)',
            position: 'relative',
          }}
        >
          {mode === 'p2p' && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'var(--color-cta)',
              color: '#0F172A',
              borderRadius: 'var(--radius-full)',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Check size={12} strokeWidth={3} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
            <Zap size={18} color="var(--color-cta)" />
            <h3 className="font-heading" style={{ fontSize: '13px', color: 'var(--color-text)' }}>
              MODE A: WEBRTC DIRECT P2P
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>
            Direct browser-to-browser SCTP stream over encrypted DataChannel. Maximum privacy, zero bytes stored in the cloud.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            <span className="badge badge-green">UNLIMITED SIZE</span>
            <span className="badge badge-green">$0.00 COST</span>
            <span className="badge badge-cyan">SIMULTANEOUS SENDER + RECEIVER</span>
          </div>
        </div>

        {/* Mode B: Cloudflare R2 Staging */}
        <div
          onClick={() => handleSelect('r2')}
          className="card"
          style={{
            cursor: disabled ? 'not-allowed' : 'pointer',
            borderColor: mode === 'r2' ? 'var(--color-cyan)' : 'var(--color-border)',
            background: mode === 'r2' ? 'rgba(6, 182, 212, 0.06)' : 'var(--color-surface-card)',
            boxShadow: mode === 'r2' ? '0 0 20px rgba(6, 182, 212, 0.15)' : 'none',
            padding: 'var(--space-md)',
            position: 'relative',
          }}
        >
          {mode === 'r2' && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'var(--color-cyan)',
              color: '#0F172A',
              borderRadius: 'var(--radius-full)',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Check size={12} strokeWidth={3} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
            <Cloud size={18} color="var(--color-cyan)" />
            <h3 className="font-heading" style={{ fontSize: '13px', color: 'var(--color-text)' }}>
              MODE B: CLOUDFLARE R2 STAGING
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>
            Asynchronous parallel multi-part chunk staging. Recipient downloads anytime via S3 pre-signed edge URLs with zero egress fees.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            <span className="badge badge-cyan">ASYNCHRONOUS PICKUP</span>
            <span className="badge badge-cyan">4-8 PARALLEL PUTS</span>
            <span className="badge badge-green">$0 EGRESS BANDWIDTH</span>
          </div>
        </div>
      </div>
    </div>
  );
};
