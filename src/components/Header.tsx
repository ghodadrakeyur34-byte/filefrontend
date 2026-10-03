import React, { useState } from 'react';
import { soundEffects } from '../lib/audio.js';
import { Volume2, VolumeX, Download, Send } from 'lucide-react';

interface HeaderProps {
  activeTab?: 'send' | 'receive';
  onTabChange?: (tab: 'send' | 'receive') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab = 'send', onTabChange }) => {
  const [audioEnabled, setAudioEnabled] = useState(soundEffects.isEnabled());

  const handleToggleAudio = () => {
    const next = soundEffects.toggle();
    setAudioEnabled(next);
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--color-border)',
      background: 'rgba(9, 13, 22, 0.8)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-cta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="font-brand" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.05em' }}>
              HYPER<span style={{ color: 'var(--color-cta)' }}>BEAM</span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-dim)', fontWeight: 600 }}>
              FREE TIER
            </span>
          </div>
        </div>

        {/* Center Navigation Tabs: Send / Receive */}
        {onTabChange && (
          <div className="segmented-control">
            <button
              onClick={() => onTabChange('send')}
              className={`segment-btn ${activeTab === 'send' ? 'active' : ''}`}
            >
              <Send size={14} />
              Send
            </button>
            <button
              onClick={() => onTabChange('receive')}
              className={`segment-btn ${activeTab === 'receive' ? 'active' : ''}`}
            >
              <Download size={14} />
              Receive
            </button>
          </div>
        )}

        {/* Right Tools & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
          }}>
            <span className="status-dot" />
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Relay Ready</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleAudio}
            className="btn-icon"
            title={audioEnabled ? 'Mute sound' : 'Enable sound'}
            aria-label="Toggle Audio"
          >
            {audioEnabled ? <Volume2 size={16} color="var(--color-cta)" /> : <VolumeX size={16} />}
          </button>

          {/* GitHub Repo */}
          <a
            href="https://github.com/ghodadrakeyur34-byte/filefrontend"
            target="_blank"
            rel="noreferrer"
            className="btn-icon"
            title="GitHub Repository"
            aria-label="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
};
