import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';

export const resolveKrmfStorageDir = (): string | null => {
  const configured = process.env.PORTAL_FILE_STORAGE_DIR?.trim();
  return configured ? path.resolve(configured) : null;
};

export const ensureKrmfStorageDir = async (dir: string): Promise<void> => {
  await mkdir(dir, { recursive: true });
};

export const isPathInside = (dir: string, candidate: string): boolean => {
  const relative = path.relative(dir, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
};

export const sha256Hex = (buffer: Buffer): string =>
  createHash('sha256').update(buffer).digest('hex');

export interface StoredKrmfFile {
  storedName: string;
  sha256: string;
  sizeBytes: number;
}

export const writeKrmfFile = async (
  dir: string,
  buffer: Buffer,
): Promise<StoredKrmfFile> => {
  const storedName = randomUUID();
  const target = path.resolve(dir, storedName);
  if (!isPathInside(dir, target)) {
    throw new Error('krmf_file_path_escape');
  }
  await writeFile(target, buffer, { flag: 'wx' });
  return { storedName, sha256: sha256Hex(buffer), sizeBytes: buffer.length };
};

export const readKrmfFile = async (
  dir: string,
  storedName: string,
): Promise<Buffer> => {
  const target = path.resolve(dir, storedName);
  if (!isPathInside(dir, target)) {
    throw new Error('krmf_file_path_escape');
  }
  return readFile(target);
};

export const removeKrmfFile = async (
  dir: string,
  storedName: string,
): Promise<void> => {
  const target = path.resolve(dir, storedName);
  if (!isPathInside(dir, target)) {
    throw new Error('krmf_file_path_escape');
  }
  await unlink(target);
};
