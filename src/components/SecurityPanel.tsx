import React, { useState } from 'react';
import { Lock, Key, FileCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface SecurityPanelProps {
  hasKey: boolean;
  sha256?: string;
  isVerified?: boolean;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ hasKey, sha256, isVerified }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div style={{
      borderTop: '1px solid var(--color-border)',
      paddingTop: '16px',
      marginTop: '16px',
    }}>
      {/* Compact Security Header / Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <Lock size={13} color={hasKey ? 'var(--color-cta)' : 'var(--color-text-dim)'} />
            <span>AES-256-GCM {hasKey ? 'Active' : 'Zero-Knowledge'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <Key size={13} color="var(--color-cyan)" />
            <span>Key Stays in Browser Anchor</span>
          </div>

          {sha256 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isVerified ? 'var(--color-cta)' : 'var(--color-text-muted)' }}>
              <FileCheck size={13} color={isVerified ? 'var(--color-cta)' : 'var(--color-amber)'} />
              <span>SHA-256 {isVerified ? 'Verified' : 'Digest Ready'}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-dim)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {showDetails ? 'Hide Specs' : 'Security Specs'}
          {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Expandable Technical Details */}
      {showDetails && (
        <div style={{
          marginTop: '14px',
          padding: '14px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '11px',
          color: 'var(--color-text-dim)',
          lineHeight: 1.5,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}>
          <div>
            <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: '2px' }}>
              End-to-End Encryption
            </strong>
            Payload slices are encrypted locally via Web Crypto API with 96-bit initialization vectors.
          </div>
          <div>
            <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: '2px' }}>
              Zero Server Exposure
            </strong>
            The symmetric key is placed after the URL hash fragment (#key=...). HTTP servers never receive it.
          </div>
          {sha256 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: '2px' }}>
                Payload Checksum
              </strong>
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontSize: '10px', wordBreak: 'break-all' }}>
                {sha256}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
