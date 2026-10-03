import React, { useState } from 'react';
import { Copy, Check, X, ShieldAlert, ExternalLink } from 'lucide-react';
import { soundEffects } from '../lib/audio.js';

interface ShareModalProps {
  shareUrl: string;
  roomId: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ shareUrl, roomId, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      soundEffects.playLock();
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      prompt('Copy transfer URL:', shareUrl);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span className="beacon" />
            <h3 className="font-heading" style={{ fontSize: '14px', color: 'var(--color-text)' }}>
              TRANSMISSION LINK GENERATED
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '30px', height: '30px' }}
            aria-label="Close Modal"
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
          Share this link with your recipient. The file is streamed with Zero-Knowledge encryption:
        </p>

        {/* Share Link Input Box */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="input"
            style={{ fontSize: '11px', color: 'var(--color-cta)', fontFamily: 'var(--font-mono)' }}
          />
          <button
            onClick={handleCopy}
            className="btn-primary"
            style={{ padding: '10px 18px', whiteSpace: 'nowrap' }}
          >
            {copied ? (
              <>
                <Check size={14} />
                COPIED
              </>
            ) : (
              <>
                <Copy size={14} />
                COPY
              </>
            )}
          </button>
        </div>

        {/* Room Code Badge */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>
              SECURE ROOM PIN
            </div>
            <div className="font-heading" style={{ fontSize: '16px', color: 'var(--color-text)', letterSpacing: '0.1em' }}>
              {roomId}
            </div>
          </div>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '11px' }}
          >
            <ExternalLink size={13} />
            OPEN IN NEW TAB
          </a>
        </div>

        {/* Security Notice */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-sm)',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
          fontSize: '11px',
          color: '#E0F2FE',
        }}>
          <ShieldAlert size={18} color="var(--color-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Zero-Knowledge Anchor Protection:</strong> The 256-bit AES key is contained after the <code>#</code> symbol. Web browsers never transmit URL anchors to HTTP servers, guaranteeing zero third-party visibility.
          </div>
        </div>
      </div>
    </div>
  );
};
