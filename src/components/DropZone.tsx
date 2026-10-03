import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { SpeedMonitor } from '../lib/speedMonitor.js';
import { calculateOptimalChunkSize, generateChunkManifest } from '../lib/chunker.js';
import { soundEffects } from '../lib/audio.js';

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelected, selectedFile, disabled }) => {
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
    <div style={{ marginBottom: 'var(--space-xl)' }}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--color-cta)' : selectedFile ? 'rgba(34, 197, 94, 0.4)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-2xl) var(--space-xl)',
          textAlign: 'center',
          background: isDragOver ? 'rgba(34, 197, 94, 0.05)' : 'rgba(30, 41, 59, 0.4)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all var(--transition-normal)',
          boxShadow: isDragOver ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
        }}
      >
        {/* Futuristic Laser Scanner Animation */}
        <div className="laser-scanner" />

        {selectedFile ? (
          <div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid var(--color-cta)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-md)',
              boxShadow: 'var(--shadow-glow)',
            }}>
              <CheckCircle2 size={28} color="var(--color-cta)" />
            </div>

            <h3 className="font-heading" style={{ fontSize: '15px', color: 'var(--color-text)', marginBottom: 'var(--space-xs)' }}>
              {selectedFile.name}
            </h3>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-md)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-md)',
            }}>
              <span>SIZE: <strong style={{ color: 'var(--color-text)' }}>{SpeedMonitor.formatBytes(selectedFile.size)}</strong></span>
              <span>•</span>
              <span>PARTITION: <strong style={{ color: 'var(--color-cyan)' }}>{chunks.length} CHUNKS ({SpeedMonitor.formatBytes(chunkSize)}/ea)</strong></span>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--color-text-dim)' }}>
              Click to replace payload or drop a different file.
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-md)',
            }}>
              <UploadCloud size={32} color={isDragOver ? 'var(--color-cta)' : 'var(--color-cyan)'} />
            </div>

            <h3 className="font-heading" style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: 'var(--space-xs)' }}>
              STAGE LARGE PAYLOAD FOR TRANSMISSION
            </h3>

            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)', maxWidth: '480px', margin: '0 auto var(--space-md)' }}>
              Drag and drop any file up to 50 GB. Memory-bounded Web Streams will slice chunks in real-time with zero browser heap overflow.
            </p>

            <button
              type="button"
              className="btn-secondary"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <FileText size={15} />
              BROWSE LOCAL STORAGE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
