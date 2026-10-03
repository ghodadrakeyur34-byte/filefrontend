import React, { useState } from 'react';
import { Copy, Check, X, Shield, ExternalLink } from 'lucide-react';
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
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt('Copy transfer URL:', shareUrl);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
              Transfer Link Ready
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '30px', height: '30px' }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
          Share this link with your recipient. The file is encrypted on your machine and streamed directly:
        </p>

        {/* Link Input Box */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="input"
            style={{ fontSize: '12px', color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}
          />
          <button
            onClick={handleCopy}
            className="btn-primary"
            style={{ padding: '8px 16px', whiteSpace: 'nowrap', fontSize: '13px' }}
          >
            {copied ? (
              <>
                <Check size={14} />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Room PIN & Open Tab */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Room PIN
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.05em' }}>
              {roomId}
            </div>
          </div>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <ExternalLink size={12} />
            Test Link
          </a>
        </div>

        {/* Privacy Note */}
        <div style={{
          display: 'flex',
          gap: '10px',
          background: 'rgba(6, 182, 212, 0.06)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          fontSize: '12px',
          color: '#BAE6FD',
          lineHeight: 1.4,
        }}>
          <Shield size={16} color="var(--color-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Zero-Knowledge:</strong> The decryption key is embedded in the <code>#key=...</code> anchor. Browsers never transmit URL anchors to web servers.
          </div>
        </div>
      </div>
    </div>
  );
};
