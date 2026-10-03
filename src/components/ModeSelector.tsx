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
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Select Transfer Mode
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-cta)', fontWeight: 600 }}>
          100% Free-Tier
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
      }}>
        {/* Mode A: P2P */}
        <button
          type="button"
          onClick={() => handleSelect('p2p')}
          disabled={disabled}
          style={{
            padding: '14px 16px',
            background: mode === 'p2p' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${mode === 'p2p' ? 'var(--color-cta)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            textAlign: 'left',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-md)',
                background: mode === 'p2p' ? 'var(--color-cta-soft)' : 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Zap size={15} color={mode === 'p2p' ? 'var(--color-cta)' : 'var(--color-text-muted)'} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                Direct P2P
              </span>
            </div>
            {mode === 'p2p' && (
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--color-cta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#090D16',
              }}>
                <Check size={12} strokeWidth={3} />
              </div>
            )}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', margin: 0, lineHeight: 1.4 }}>
            Browser-to-browser SCTP stream. Zero cloud storage, unlimited file sizes.
          </p>
        </button>

        {/* Mode B: Cloudflare R2 */}
        <button
          type="button"
          onClick={() => handleSelect('r2')}
          disabled={disabled}
          style={{
            padding: '14px 16px',
            background: mode === 'r2' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${mode === 'r2' ? 'var(--color-cyan)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            textAlign: 'left',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-md)',
                background: mode === 'r2' ? 'var(--color-cyan-soft)' : 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Cloud size={15} color={mode === 'r2' ? 'var(--color-cyan)' : 'var(--color-text-muted)'} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                Cloudflare R2
              </span>
            </div>
            {mode === 'r2' && (
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--color-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#090D16',
              }}>
                <Check size={12} strokeWidth={3} />
              </div>
            )}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', margin: 0, lineHeight: 1.4 }}>
            Asynchronous edge staging. Recipient downloads later with $0 egress fees.
          </p>
        </button>
      </div>
    </div>
  );
};
