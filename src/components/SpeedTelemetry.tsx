import React from 'react';
import type { TransferTelemetry } from '../types/index.js';
import { SpeedMonitor } from '../lib/speedMonitor.js';
import { Gauge, Clock, HardDrive, Wifi } from 'lucide-react';

interface SpeedTelemetryProps {
  telemetry: TransferTelemetry;
}

export const SpeedTelemetry: React.FC<SpeedTelemetryProps> = ({ telemetry }) => {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      marginBottom: '16px',
    }}>
      {/* Top Header: Progress % & Status */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="font-brand" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text)' }}>
            {telemetry.percent}%
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-dim)', fontWeight: 600 }}>
            {telemetry.chunksCompleted} of {telemetry.totalChunks} chunks
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: telemetry.iceType === 'direct-p2p' ? 'var(--color-cta)' : 'var(--color-cyan)',
          fontWeight: 600,
        }}>
          <Wifi size={13} />
          <span>{telemetry.iceType.toUpperCase()}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        marginBottom: '16px',
      }}>
        <div style={{
          width: `${telemetry.percent}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #10B981 0%, #22C55E 100%)',
          boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)',
          borderRadius: 'var(--radius-full)',
          transition: 'width 200ms ease',
        }} />
      </div>

      {/* 3 Metric Pills */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
      }}>
        {/* Speed */}
        <div style={{
          padding: '10px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-dim)', fontSize: '11px', marginBottom: '2px' }}>
            <Gauge size={12} color="var(--color-cta)" />
            <span>Velocity</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
            {SpeedMonitor.formatSpeed(telemetry.speedBps)}
          </div>
        </div>

        {/* ETA */}
        <div style={{
          padding: '10px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-dim)', fontSize: '11px', marginBottom: '2px' }}>
            <Clock size={12} color="var(--color-cyan)" />
            <span>Remaining</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
            {SpeedMonitor.formatDuration(telemetry.etaSeconds)}
          </div>
        </div>

        {/* Transferred */}
        <div style={{
          padding: '10px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-dim)', fontSize: '11px', marginBottom: '2px' }}>
            <HardDrive size={12} color="var(--color-amber)" />
            <span>Streamed</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {SpeedMonitor.formatBytes(telemetry.bytesTransferred)}
          </div>
        </div>
      </div>
    </div>
  );
};
