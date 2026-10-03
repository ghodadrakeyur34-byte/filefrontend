import React, { useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { SpeedMonitor } from '../lib/speedMonitor.js';
import { calculateOptimalChunkSize, generateChunkManifest } from '../lib/chunker.js';
import { soundEffects } from '../lib/audio.js';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  onClearFile?: () => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelected,
  onClearFile,
  selectedFile,
  disabled,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      soundEffects.playLock();
      onFileSelected(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      soundEffects.playLock();
      onFileSelected(file);
    }
  };

  const chunkSize = selectedFile ? calculateOptimalChunkSize(selectedFile.size) : 16 * 1024 * 1024;
  const chunks = selectedFile ? generateChunkManifest(selectedFile.size, chunkSize) : [];

  return (
    <div style={{ marginBottom: '20px' }}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        disabled={disabled}
      />

      {selectedFile ? (
        /* Selected File Card */
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-cta-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileIcon size={20} color="var(--color-cta)" />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {selectedFile.name}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                marginTop: '2px',
              }}>
                <span>{SpeedMonitor.formatBytes(selectedFile.size)}</span>
                <span>•</span>
                <span style={{ color: 'var(--color-cyan)' }}>{chunks.length} chunks ({SpeedMonitor.formatBytes(chunkSize)}/ea)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Change
            </button>
            {onClearFile && (
              <button
                type="button"
                onClick={onClearFile}
                disabled={disabled}
                className="btn-icon"
                style={{ width: '32px', height: '32px' }}
                title="Remove file"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty Drop Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? 'var(--color-cta)' : 'rgba(255, 255, 255, 0.12)'}`,
            borderRadius: 'var(--radius-xl)',
            padding: '36px 20px',
            textAlign: 'center',
            background: isDragOver ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255, 255, 255, 0.02)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <UploadCloud size={24} color={isDragOver ? 'var(--color-cta)' : 'var(--color-text-muted)'} />
          </div>

          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
            Click or drag file here to transfer
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-dim)', margin: 0 }}>
            Supports any file up to 50 GB. Memory-bounded Web Streams handle slicing locally.
          </p>
        </div>
      )}
    </div>
  );
};
