import React from 'react';
import type { ChunkInfo } from '../types/index.js';

interface ChunkMatrixProps {
  chunks: ChunkInfo[];
  currentChunkIndex?: number;
}

export const ChunkMatrix: React.FC<ChunkMatrixProps> = ({ chunks, currentChunkIndex }) => {
  const completedCount = chunks.filter((c) => c.status === 'completed').length;
  const activeCount = chunks.filter((c) => c.status === 'active').length;
  const pendingCount = chunks.filter((c) => c.status === 'pending').length;

  return (
    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
        gap: 'var(--space-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span className="beacon" />
          <h3 className="font-heading" style={{ fontSize: '12px', color: 'var(--color-text)' }}>
            MEMORY BUFFER & CHUNK MATRIX
          </h3>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '11px' }}>
          <span style={{ color: 'var(--color-cta)' }}>
            COMPLETED: <strong>{completedCount}</strong>
          </span>
          <span style={{ color: 'var(--color-cyan)' }}>
            IN FLIGHT: <strong>{activeCount}</strong>
          </span>
          <span style={{ color: 'var(--color-text-dim)' }}>
            PENDING: <strong>{pendingCount}</strong>
          </span>
        </div>
      </div>

      {/* Grid of chunk blocks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(22px, 1fr))',
        gap: '6px',
        maxHeight: '220px',
        overflowY: 'auto',
        padding: 'var(--space-xs)',
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(51, 65, 85, 0.4)',
      }}>
        {chunks.map((chunk) => {
          const isCurrent = currentChunkIndex === chunk.index;
          let bg = 'rgba(30, 41, 59, 0.8)';
          let border = 'rgba(51, 65, 85, 0.5)';
          let glow = 'none';

          if (chunk.status === 'completed') {
            bg = 'var(--color-cta)';
            border = 'var(--color-cta)';
            glow = '0 0 8px rgba(34, 197, 94, 0.4)';
          } else if (chunk.status === 'active' || isCurrent) {
            bg = 'var(--color-cyan)';
            border = '#22D3EE';
            glow = '0 0 10px rgba(6, 182, 212, 0.8)';
          } else if (chunk.status === 'failed') {
            bg = 'var(--color-danger)';
            border = 'var(--color-danger)';
          }

          return (
            <div
              key={chunk.index}
              title={`Chunk #${chunk.index + 1}: ${chunk.status.toUpperCase()} (${(chunk.size / 1024 / 1024).toFixed(1)} MB)`}
              style={{
                height: '22px',
                borderRadius: '3px',
                background: bg,
                border: `1px solid ${border}`,
                boxShadow: glow,
                transition: 'all 200ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 700,
                color: chunk.status === 'completed' || chunk.status === 'active' ? '#0F172A' : 'var(--color-text-dim)',
                animation: chunk.status === 'active' || isCurrent ? 'pulseGlow 1s infinite' : 'none',
              }}
            >
              {chunk.index + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
};
