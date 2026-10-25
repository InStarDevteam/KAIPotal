import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import {
  resolveKrmfStorageDir,
  ensureKrmfStorageDir,
  isPathInside,
  readKrmfFile,
  removeKrmfFile,
  sha256Hex,
  writeKrmfFile,
} from './krmfStorage';

describe('krmf 증적 파일 저장소', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'krmf-test-'));
    await ensureKrmfStorageDir(dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('저장 후 읽으면 내용과 해시가 일치한다', async () => {
    const buffer = Buffer.from('증적 파일 내용');
    const stored = await writeKrmfFile(dir, buffer);
    expect(stored.sha256).toBe(sha256Hex(buffer));
    expect(stored.sizeBytes).toBe(buffer.length);
    const readBack = await readKrmfFile(dir, stored.storedName);
    expect(readBack.equals(buffer)).toBe(true);
    await removeKrmfFile(dir, stored.storedName);
    await expect(readKrmfFile(dir, stored.storedName)).rejects.toThrow();
  });

  test('저장 이름이 저장 디렉터리 바깥을 가리키면 거부한다(경로 탐색 방어)', async () => {
    expect(isPathInside(dir, path.resolve(dir, '..', 'escape'))).toBe(false);
    expect(isPathInside(dir, path.resolve('/etc/passwd'))).toBe(false);
    expect(isPathInside(dir, dir)).toBe(false);
    expect(isPathInside(dir, path.join(dir, 'child'))).toBe(true);
    await expect(readKrmfFile(dir, '../outside')).rejects.toThrow('krmf_file_path_escape');
    await expect(readKrmfFile(dir, '/etc/passwd')).rejects.toThrow(
      'krmf_file_path_escape',
    );
  });

  test('같은 내용을 두 번 저장해 이름은 서로 다르다(덮어쓰기 없음)', async () => {
    const buffer = Buffer.from('동일 내용');
    const first = await writeKrmfFile(dir, buffer);
    const second = await writeKrmfFile(dir, buffer);
    expect(first.storedName).not.toBe(second.storedName);
    expect(first.sha256).toBe(second.sha256);
  });
});

it('requires explicit file storage and preserves the configured path', () => {
  const original = process.env.PORTAL_FILE_STORAGE_DIR;
  try {
    delete process.env.PORTAL_FILE_STORAGE_DIR;
    expect(resolveKrmfStorageDir()).toBeNull();
    process.env.PORTAL_FILE_STORAGE_DIR = '   ';
    expect(resolveKrmfStorageDir()).toBeNull();
    process.env.PORTAL_FILE_STORAGE_DIR = '/durable/portal-evidence';
    expect(resolveKrmfStorageDir()).toBe('/durable/portal-evidence');
  } finally {
    if (original === undefined) delete process.env.PORTAL_FILE_STORAGE_DIR;
    else process.env.PORTAL_FILE_STORAGE_DIR = original;
  }
});
