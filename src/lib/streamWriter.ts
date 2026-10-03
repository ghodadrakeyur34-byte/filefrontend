/**
 * HyperBeam Direct-to-Disk Stream Writer
 *
 * Utilizes the native browser File System Access API (FileSystemWritableFileStream)
 * so incoming 50GB+ payloads stream directly to NVMe/HDD storage without loading
 * into browser heap memory.
 */

export interface DiskWriter {
  writeChunk(chunkData: ArrayBuffer | Uint8Array, offset?: number): Promise<void>;
  close(): Promise<void>;
  abort(reason?: string): Promise<void>;
}

export class DirectDiskWriter implements DiskWriter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private writable: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(writable: any) {
    this.writable = writable;
  }

  public async writeChunk(chunkData: ArrayBuffer | Uint8Array, offset?: number): Promise<void> {
    if (typeof offset === 'number') {
      await this.writable.seek(offset);
    }
    await this.writable.write(chunkData);
  }

  public async close(): Promise<void> {
    await this.writable.close();
  }

  public async abort(reason?: string): Promise<void> {
    await this.writable.abort(reason);
  }
}

/**
 * Fallback in-memory stream assembler for browsers lacking showSaveFilePicker
 */
export class MemoryFallbackWriter implements DiskWriter {
  private chunks: Uint8Array[] = [];
  private fileName: string;
  private fileType: string;

  constructor(fileName: string, fileType: string) {
    this.fileName = fileName;
    this.fileType = fileType;
  }

  public async writeChunk(chunkData: ArrayBuffer | Uint8Array): Promise<void> {
    const bytes = chunkData instanceof Uint8Array ? chunkData : new Uint8Array(chunkData);
    this.chunks.push(bytes);
  }

  public async close(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = new Blob(this.chunks as any, { type: this.fileType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    this.chunks = [];
  }

  public async abort(): Promise<void> {
    this.chunks = [];
  }
}

/**
 * Prompts user for destination file path and returns a DiskWriter
 */
export async function initializeDestinationWriter(
  suggestedName: string,
  fileType: string = 'application/octet-stream'
): Promise<{ writer: DiskWriter; isDirectDisk: boolean }> {
  // Check if File System Access API is supported
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle: any = await (window as any).showSaveFilePicker({
        suggestedName,
      });
      const writable = await handle.createWritable();
      return {
        writer: new DirectDiskWriter(writable),
        isDirectDisk: true,
      };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error('File save cancelled by user.');
      }
      console.warn('Direct disk picker failed, using in-browser streaming fallback:', err);
    }
  }

  return {
    writer: new MemoryFallbackWriter(suggestedName, fileType),
    isDirectDisk: false,
  };
}
