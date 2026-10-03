import React from 'react';
import type { TransferTelemetry } from '../types/index.js';
import { SpeedMonitor } from '../lib/speedMonitor.js';
import { Gauge, Clock, Activity, HardDrive } from 'lucide-react';

interface SpeedTelemetryProps {
  telemetry: TransferTelemetry;
}

export const SpeedTelemetry: React.FC<SpeedTelemetryProps> = ({ telemetry }) => {
  return (
    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
      {/* High-Level Numbers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-lg)',
      }}>
        {/* Speed */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--color-cta)', marginBottom: '4px' }}>
            <Gauge size={16} />
            <span style={{ fontSize: '11px', letterSpacing: '0.05em' }}>TRANSFER VELOCITY</span>
          </div>
          <div className="font-heading" style={{ fontSize: '20px', color: 'var(--color-text)', fontWeight: 700 }}>
            {SpeedMonitor.formatSpeed(telemetry.speedBps)}
          </div>
        </div>

        {/* ETA */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--color-cyan)', marginBottom: '4px' }}>
            <Clock size={16} />
            <span style={{ fontSize: '11px', letterSpacing: '0.05em' }}>ESTIMATED TIME (ETA)</span>
          </div>
          <div className="font-heading" style={{ fontSize: '20px', color: 'var(--color-text)', fontWeight: 700 }}>
            {SpeedMonitor.formatDuration(telemetry.etaSeconds)}
          </div>
        </div>

        {/* Bytes Transferred */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--color-amber)', marginBottom: '4px' }}>
            <HardDrive size={16} />
            <span style={{ fontSize: '11px', letterSpacing: '0.05em' }}>PAYLOAD STREAMED</span>
          </div>
          <div className="font-heading" style={{ fontSize: '16px', color: 'var(--color-text)', fontWeight: 700 }}>
            {SpeedMonitor.formatBytes(telemetry.bytesTransferred)} / {SpeedMonitor.formatBytes(telemetry.totalBytes)}
          </div>
        </div>

        {/* Route / ICE Type */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: '#A78BFA', marginBottom: '4px' }}>
            <Activity size={16} />
            <span style={{ fontSize: '11px', letterSpacing: '0.05em' }}>ROUTING PATHWAY</span>
          </div>
          <div className="font-heading" style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: 700 }}>
            {telemetry.iceType.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Progress Bar with Glowing Edge */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-xs)',
          fontSize: '12px',
        }}>
          <span style={{ color: 'var(--color-text-muted)' }}>STREAM PIPELINE PROGRESS</span>
          <span className="font-heading" style={{ color: 'var(--color-cta)', fontWeight: 700 }}>
            {telemetry.percent}%
          </span>
        </div>

        <div style={{
          width: '100%',
          height: '10px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          position: 'relative',
        }}>
          <div style={{
            width: `${telemetry.percent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #10B981 0%, var(--color-cta) 100%)',
            boxShadow: '0 0 12px var(--color-cta)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 200ms ease',
          }} />
        </div>
      </div>
    </div>
  );
};
