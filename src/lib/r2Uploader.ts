import { API_URL } from './config.js';
import type { ChunkInfo } from '../types/index.js';
import { readChunkSlice } from './chunker.js';
import { encryptBuffer, decryptBuffer } from './crypto.js';
import type { DiskWriter } from './streamWriter.js';

export interface R2UploadProgress {
  chunkIndex: number;
  totalChunks: number;
  bytesUploaded: number;
  totalBytes: number;
  partNumber: number;
}

export class R2TransferEngine {
  /**
   * Uploads a file to Cloudflare R2 in parallel encrypted multipart chunks
   */
  public static async uploadFile(
    file: File,
    chunks: ChunkInfo[],
    cryptoKey: CryptoKey,
    concurrency: number = 4,
    onProgress?: (progress: R2UploadProgress) => void
  ): Promise<{ key: string; uploadId: string }> {
    // 1. Initiate multipart upload on backend
    const initRes = await fetch(`${API_URL}/api/storage/initiate-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }),
    });

    if (!initRes.ok) {
      throw new Error(`Failed to initiate R2 multipart upload: ${initRes.statusText}`);
    }

    const { key, uploadId } = await initRes.json();
    const completedParts: Array<{ partNumber: number; etag: string }> = [];
    let bytesUploaded = 0;

    // Queue for parallel chunk upload
    const queue = [...chunks];
    const totalChunks = chunks.length;

    const worker = async () => {
      while (queue.length > 0) {
        const chunk = queue.shift();
        if (!chunk) break;

        const partNumber = chunk.index + 1; // S3 part numbers are 1-based

        // Read raw chunk slice
        const rawSlice = await readChunkSlice(file, chunk);

        // Encrypt with client-side Zero-Knowledge AES-256-GCM
        const encrypted = await encryptBuffer(rawSlice, cryptoKey);

        // Request pre-signed PUT URL from backend
        const presignRes = await fetch(`${API_URL}/api/storage/presign-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, partNumber, uploadId }),
        });

        if (!presignRes.ok) {
          throw new Error(`Failed to get presigned upload URL for part ${partNumber}`);
        }

        const { uploadUrl } = await presignRes.json();

        // Direct-from-browser HTTP PUT to Cloudflare R2 edge
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: encrypted as unknown as BodyInit,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload part ${partNumber} to R2: ${uploadRes.statusText}`);
        }

        const etag = uploadRes.headers.get('ETag') || `"${Date.now()}"`;
        completedParts.push({ partNumber, etag });

        bytesUploaded += chunk.size;
        onProgress?.({
          chunkIndex: chunk.index,
          totalChunks,
          bytesUploaded,
          totalBytes: file.size,
          partNumber,
        });
      }
    };

    // Run parallel upload workers (4-8 workers per TECHstack.md)
    const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, () => worker());
    await Promise.all(workers);

    // Complete multipart upload
    const completeRes = await fetch(`${API_URL}/api/storage/complete-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        uploadId,
        parts: completedParts,
      }),
    });

    if (!completeRes.ok) {
      throw new Error('Failed to finalize multipart upload on R2');
    }

    return { key, uploadId };
  }

  /**
   * Downloads an encrypted file from Cloudflare R2 and streams directly to disk
   */
  public static async downloadFile(
    key: string,
    cryptoKey: CryptoKey,
    writer: DiskWriter,
    onProgress?: (percent: number, bytesDownloaded: number, totalBytes: number) => void
  ): Promise<void> {
    const presignRes = await fetch(`${API_URL}/api/storage/presign-download?key=${encodeURIComponent(key)}`);
    if (!presignRes.ok) {
      throw new Error('Failed to get download URL from R2');
    }

    const { downloadUrl } = await presignRes.json();
    const downloadRes = await fetch(downloadUrl);
    if (!downloadRes.ok) {
      throw new Error(`Failed to fetch file from R2: ${downloadRes.statusText}`);
    }

    const contentLength = parseInt(downloadRes.headers.get('Content-Length') || '0', 10);
    const encryptedArrayBuffer = await downloadRes.arrayBuffer();

    onProgress?.(50, encryptedArrayBuffer.byteLength, contentLength || encryptedArrayBuffer.byteLength);

    // Decrypt zero-knowledge payload
    const decrypted = await decryptBuffer(new Uint8Array(encryptedArrayBuffer), cryptoKey);

    // Stream write to local disk
    await writer.writeChunk(decrypted);
    await writer.close();

    onProgress?.(100, decrypted.byteLength, decrypted.byteLength);
  }
}
