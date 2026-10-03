import type { ChunkInfo } from '../types/index.js';

export const DEFAULT_CHUNK_SIZE = 16 * 1024 * 1024; // 16 MB
export const MAX_CHUNK_SIZE = 32 * 1024 * 1024; // 32 MB
export const MIN_CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB for small files

/**
 * Calculates optimal chunk size based on file size to balance network packet overhead
 * and browser memory limits.
 */
export function calculateOptimalChunkSize(fileSize: number): number {
  if (fileSize < 16 * 1024 * 1024) {
    return Math.max(MIN_CHUNK_SIZE, Math.ceil(fileSize / 16));
  }
  if (fileSize <= 500 * 1024 * 1024) {
    return 8 * 1024 * 1024; // 8 MB
  }
  if (fileSize <= 2 * 1024 * 1024 * 1024) {
    return DEFAULT_CHUNK_SIZE; // 16 MB
  }
  return MAX_CHUNK_SIZE; // 32 MB for multi-gigabyte transfers
}

/**
 * Generates an array of chunk metadata for bounded memory slice processing.
 */
export function generateChunkManifest(
  fileSize: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): ChunkInfo[] {
  const totalChunks = Math.ceil(fileSize / chunkSize) || 1;
  const chunks: ChunkInfo[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, fileSize);
    chunks.push({
      index: i,
      start,
      end,
      size: end - start,
      status: 'pending',
    });
  }

  return chunks;
}

/**
 * Slices a single chunk on-demand from the File handle without loading
 * the rest of the file into memory.
 */
export async function readChunkSlice(
  file: File,
  chunk: ChunkInfo
): Promise<ArrayBuffer> {
  const blob = file.slice(chunk.start, chunk.end);
  return await blob.arrayBuffer();
}
