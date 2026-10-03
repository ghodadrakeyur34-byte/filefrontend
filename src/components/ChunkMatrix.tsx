import React, { useState } from 'react';
import type { ChunkInfo } from '../types/index.js';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface ChunkMatrixProps {
  chunks: ChunkInfo[];
  currentChunkIndex?: number;
}

export const ChunkMatrix: React.FC<ChunkMatrixProps> = ({ chunks, currentChunkIndex }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const completedCount = chunks.filter((c) => c.status === 'completed').length;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={14} color="var(--color-cta)" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
            Memory Block Matrix
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-dim)' }}>
            ({completedCount}/{chunks.length})
          </span>
        </div>

        {chunks.length > 32 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
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
            {isExpanded ? 'Collapse' : 'Show All'}
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {/* Grid of chunk blocks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(18px, 1fr))',
        gap: '4px',
        maxHeight: isExpanded ? '200px' : '64px',
        overflowY: isExpanded ? 'auto' : 'hidden',
        padding: '2px',
        transition: 'max-height var(--transition-normal)',
      }}>
        {chunks.map((chunk) => {
          const isCurrent = currentChunkIndex === chunk.index;
          let bg = 'rgba(255, 255, 255, 0.05)';
          let border = 'rgba(255, 255, 255, 0.08)';

          if (chunk.status === 'completed') {
            bg = 'var(--color-cta)';
            border = 'var(--color-cta)';
          } else if (chunk.status === 'active' || isCurrent) {
            bg = 'var(--color-cyan)';
            border = '#22D3EE';
          } else if (chunk.status === 'failed') {
            bg = 'var(--color-danger)';
            border = 'var(--color-danger)';
          }

          return (
            <div
              key={chunk.index}
              title={`Chunk #${chunk.index + 1}: ${chunk.status.toUpperCase()}`}
              style={{
                height: '18px',
                borderRadius: '3px',
                background: bg,
                border: `1px solid ${border}`,
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                fontWeight: 700,
                color: chunk.status === 'completed' || chunk.status === 'active' ? '#090D16' : 'var(--color-text-dim)',
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
