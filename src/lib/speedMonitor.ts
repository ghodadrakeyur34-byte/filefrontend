export interface SpeedSample {
  timestamp: number;
  bytes: number;
}

export class SpeedMonitor {
  private samples: SpeedSample[] = [];
  private totalBytes: number = 0;
  private bytesTransferred: number = 0;
  private startTime: number = 0;

  constructor(totalBytes: number) {
    this.totalBytes = totalBytes;
    this.startTime = Date.now();
  }

  public recordProgress(bytesCurrent: number): void {
    const now = Date.now();
    this.bytesTransferred = bytesCurrent;
    this.samples.push({ timestamp: now, bytes: bytesCurrent });

    // Keep only samples within the last 5 seconds for smooth moving average
    const windowStart = now - 5000;
    while (this.samples.length > 2 && this.samples[0].timestamp < windowStart) {
      this.samples.shift();
    }
  }

  public getInstantaneousSpeed(): number {
    if (this.samples.length < 2) return 0;
    const oldest = this.samples[0];
    const newest = this.samples[this.samples.length - 1];
    const deltaMs = newest.timestamp - oldest.timestamp;
    if (deltaMs <= 0) return 0;

    const deltaBytes = newest.bytes - oldest.bytes;
    return (deltaBytes / deltaMs) * 1000; // Bytes per second
  }

  public getAverageSpeed(): number {
    const elapsedMs = Date.now() - this.startTime;
    if (elapsedMs <= 0) return 0;
    return (this.bytesTransferred / elapsedMs) * 1000;
  }

  public getEstimatedTimeRemainingSeconds(): number {
    const speed = this.getInstantaneousSpeed() || this.getAverageSpeed();
    if (speed <= 0) return 0;
    const remainingBytes = Math.max(0, this.totalBytes - this.bytesTransferred);
    return Math.ceil(remainingBytes / speed);
  }

  public getPercent(): number {
    if (this.totalBytes <= 0) return 0;
    return Math.min(100, Math.round((this.bytesTransferred / this.totalBytes) * 100));
  }

  public static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  public static formatSpeed(bytesPerSec: number): string {
    const mbps = (bytesPerSec * 8) / (1000 * 1000);
    const mBps = bytesPerSec / (1024 * 1024);
    if (mBps >= 1000) {
      return `${(mBps / 1024).toFixed(2)} GB/s (${(mbps / 1000).toFixed(2)} Gbps)`;
    }
    return `${mBps.toFixed(2)} MB/s (${mbps.toFixed(1)} Mbps)`;
  }

  public static formatDuration(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return '--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
