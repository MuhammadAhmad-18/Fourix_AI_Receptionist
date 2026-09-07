import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export interface StoredFile {
  storageKey: string;
  provider: string;
}

export interface FileStorageProvider {
  upload(clinicId: string, buffer: Buffer, originalName: string): Promise<StoredFile>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}

/**
 * Local-disk provider for development (deployment target A). Mimics the
 * same interface an S3/R2 provider would — swapping providers later needs
 * no change to FileService or the routes that call it. Files are never
 * served from a public path; always through an authorized route handler.
 */
class LocalFileStorageProvider implements FileStorageProvider {
  private root = process.env.FILE_STORAGE_LOCAL_DIR ?? "./.uploads";

  async upload(clinicId: string, buffer: Buffer, originalName: string): Promise<StoredFile> {
    const dir = path.join(this.root, clinicId);
    await fs.mkdir(dir, { recursive: true });
    const safeName = `${crypto.randomUUID()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storageKey = path.join(clinicId, safeName);
    await fs.writeFile(path.join(this.root, storageKey), buffer);
    return { storageKey, provider: "local" };
  }

  async read(storageKey: string): Promise<Buffer> {
    return fs.readFile(path.join(this.root, storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await fs.rm(path.join(this.root, storageKey), { force: true });
  }
}

const PROVIDERS: Record<string, FileStorageProvider> = {
  local: new LocalFileStorageProvider(),
};

export function getFileStorageProvider(): FileStorageProvider {
  const name = process.env.FILE_STORAGE_PROVIDER ?? "local";
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown FILE_STORAGE_PROVIDER: ${name}`);
  return provider;
}

// Minimal magic-byte sniffing so an upload's declared Content-Type can't be
// trusted blindly. Extend as new file types are accepted.
const MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

export function sniffMimeType(buffer: Buffer): string | null {
  for (const { mime, bytes } of MAGIC_BYTES) {
    if (bytes.every((b, i) => buffer[i] === b)) return mime;
  }
  return null;
}
