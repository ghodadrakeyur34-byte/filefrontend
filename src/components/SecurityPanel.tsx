import React from 'react';
import { Lock, ShieldCheck, Key, FileCheck, CheckCircle } from 'lucide-react';

interface SecurityPanelProps {
  hasKey: boolean;
  sha256?: string;
  isVerified?: boolean;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ hasKey, sha256, isVerified }) => {
  return (
    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <ShieldCheck size={18} color="var(--color-cta)" />
        <h3 className="font-heading" style={{ fontSize: '12px', color: 'var(--color-text)' }}>
          ZERO-KNOWLEDGE SECURITY & CRYPTOGRAPHY
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 'var(--space-md)',
      }}>
        {/* AES-256-GCM Status */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
            <Lock size={15} color="var(--color-cta)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text)' }}>
              END-TO-END CIPHER
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
            Payloads encrypted in-browser using <strong>AES-256-GCM</strong> with 96-bit initialization vectors per chunk slice.
          </p>
          <span className="badge badge-green">
            {hasKey ? 'ACTIVE & ENCRYPTED' : 'AWAITING KEY'}
          </span>
        </div>

        {/* Ephemeral Key Zero-Knowledge Anchor */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
            <Key size={15} color="var(--color-cyan)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text)' }}>
              ZERO-KNOWLEDGE ANCHOR
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
            Decryption key is stored strictly in the URL hash fragment (<code>#key=...</code>). The anchor is <strong>never transmitted to any server</strong>.
          </p>
          <span className="badge badge-cyan">CLIENT-SIDE ONLY</span>
        </div>

        {/* SHA-256 Integrity Verification */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
            <FileCheck size={15} color="var(--color-amber)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text)' }}>
              SHA-256 CHECKSUM
            </span>
          </div>
          <p style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
            wordBreak: 'break-all',
            marginBottom: 'var(--space-xs)',
          }}>
            {sha256 || 'Calculated during transmission slice'}
          </p>
          {isVerified ? (
            <span className="badge badge-green">
              <CheckCircle size={11} />
              CHECKSUM VERIFIED BIT-FOR-BIT
            </span>
          ) : (
            <span className="badge badge-amber">STREAM VERIFICATION READY</span>
          )}
        </div>
      </div>
    </div>
  );
};
