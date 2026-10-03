/**
 * HyperBeam SCTP DataChannel Engine with Hardware Flow Control
 *
 * Implements backpressure via bufferedAmountLowThreshold to safely stream
 * 50GB+ payloads without overflowing the browser's SCTP buffer or memory heap.
 */

const MAX_PACKET_SIZE = 64 * 1024; // 64 KB SCTP frame payload
const BUFFER_HIGH_WATERMARK = 1024 * 1024; // 1 MB backpressure limit
const BUFFER_LOW_WATERMARK = 256 * 1024; // 256 KB resume threshold

export type ChunkReceivedCallback = (
  chunkIndex: number,
  totalChunks: number,
  chunkData: Uint8Array
) => Promise<void>;

export class DataChannelStreamer {
  private channel: RTCDataChannel;
  private onChunkReceived: ChunkReceivedCallback | null = null;
  private incomingChunks: Map<number, { totalSize: number; receivedSize: number; buffer: Uint8Array }> = new Map();

  constructor(channel: RTCDataChannel) {
    this.channel = channel;
    this.channel.binaryType = 'arraybuffer';
    this.channel.bufferedAmountLowThreshold = BUFFER_LOW_WATERMARK;

    this.channel.onmessage = this.handleMessage.bind(this);
  }

  public setChunkReceivedHandler(handler: ChunkReceivedCallback): void {
    this.onChunkReceived = handler;
  }

  /**
   * Sends a complete encrypted chunk by slicing it into 64KB SCTP frames
   * and applying backpressure flow control.
   */
  public async sendChunk(
    chunkIndex: number,
    totalChunks: number,
    packedEncryptedChunk: Uint8Array,
    onProgress?: (bytesSentInChunk: number) => void
  ): Promise<void> {
    const totalLength = packedEncryptedChunk.byteLength;
    let offset = 0;

    while (offset < totalLength) {
      // Flow control: if buffer is high, wait for bufferedamountlow event
      if (this.channel.bufferedAmount > BUFFER_HIGH_WATERMARK) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            this.channel.removeEventListener('bufferedamountlow', handler);
            resolve();
          };
          this.channel.addEventListener('bufferedamountlow', handler);
        });
      }

      const sliceLength = Math.min(MAX_PACKET_SIZE, totalLength - offset);
      const slicePayload = packedEncryptedChunk.subarray(offset, offset + sliceLength);

      // Construct 21-byte frame header:
      // [1 byte TYPE (0x01) | 4 bytes ChunkIndex | 4 bytes TotalChunks | 4 bytes Offset | 4 bytes TotalLength | 4 bytes SliceLength]
      const frame = new Uint8Array(21 + sliceLength);
      const view = new DataView(frame.buffer);
      view.setUint8(0, 0x01); // 0x01 = chunk slice
      view.setUint32(1, chunkIndex, false);
      view.setUint32(5, totalChunks, false);
      view.setUint32(9, offset, false);
      view.setUint32(13, totalLength, false);
      view.setUint32(17, sliceLength, false);

      frame.set(slicePayload, 21);

      this.channel.send(frame.buffer);
      offset += sliceLength;
      onProgress?.(offset);
    }
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    if (!(event.data instanceof ArrayBuffer)) return;

    const data = event.data;
    const view = new DataView(data);
    const packetType = view.getUint8(0);

    if (packetType === 0x01) {
      const chunkIndex = view.getUint32(1, false);
      const totalChunks = view.getUint32(5, false);
      const offset = view.getUint32(9, false);
      const totalLength = view.getUint32(13, false);
      const sliceLength = view.getUint32(17, false);

      const sliceData = new Uint8Array(data, 21, sliceLength);

      let chunkTracker = this.incomingChunks.get(chunkIndex);
      if (!chunkTracker) {
        chunkTracker = {
          totalSize: totalLength,
          receivedSize: 0,
          buffer: new Uint8Array(totalLength),
        };
        this.incomingChunks.set(chunkIndex, chunkTracker);
      }

      chunkTracker.buffer.set(sliceData, offset);
      chunkTracker.receivedSize += sliceLength;

      // If all slices for this chunk are assembled
      if (chunkTracker.receivedSize >= chunkTracker.totalSize) {
        this.incomingChunks.delete(chunkIndex);
        if (this.onChunkReceived) {
          await this.onChunkReceived(chunkIndex, totalChunks, chunkTracker.buffer);
        }
      }
    }
  }
}
