import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface FileSnapshotEntry {
  mtime: number;
  size: number;
  sha256?: string;
}

export type DirectorySnapshot = Map<string, FileSnapshotEntry>;

const IGNORED_SYSTEM_FILES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
]);

function shouldIgnoreFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return IGNORED_SYSTEM_FILES.has(lower) || lower.endsWith(".tmp");
}

function computeFileSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * GHI FILE AN TOÀN (SAFE FILE WRITE):
 * Tuyệt đối từ chối mọi thao tác ghi/sửa vào thư mục bất biến inputs/
 */
export function safeWriteFile(
  targetPath: string,
  content: string | NodeJS.ArrayBufferView,
  options?: fs.WriteFileOptions
): void {
  const resolved = path.resolve(targetPath);
  const cwd = process.cwd();
  const relative = path.relative(cwd, resolved).replace(/\\/g, "/");

  // Kiểm tra nếu đường dẫn nằm trong inputs/
  if (relative === "inputs" || relative.startsWith("inputs/")) {
    throw new Error(
      `🔒 [VI PHẠM BẢO VỆ BẤT BIẾN] Từ chối ghi file vào thư mục người dùng: ${relative}. Không được phép ghi đè inputs/!`
    );
  }

  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resolved, content, options);
}

/**
 * TẠO BẢN CHỤP NHANH THƯ MỤC (DIRECTORY SNAPSHOT)
 * Quét nhanh mtime và size của mọi tệp trong thư mục
 */
export function createDirectorySnapshot(dirPath: string): DirectorySnapshot {
  const snapshot: DirectorySnapshot = new Map();
  if (!fs.existsSync(dirPath)) {
    return snapshot;
  }

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (shouldIgnoreFile(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);
        const relPath = path.relative(dirPath, fullPath).replace(/\\/g, "/");
        snapshot.set(relPath, {
          mtime: stats.mtimeMs,
          size: stats.size,
        });
      }
    }
  }

  walk(dirPath);
  return snapshot;
}

/**
 * KIỂM ĐỊNH TÍNH BẤT BIẾN (CHECKSUM GUARD)
 * Kiểm tra nhanh mtime + size; nếu lệch mới băm SHA-256 để kiểm chứng nội dung thật
 */
export function verifyDirectorySnapshot(
  dirPath: string,
  initialSnapshot: DirectorySnapshot
): {
  valid: boolean;
  modified: string[];
  added: string[];
  deleted: string[];
} {
  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];

  const currentSnapshot = createDirectorySnapshot(dirPath);

  // 1. Kiểm tra các file ban đầu
  for (const [relPath, initialEntry] of initialSnapshot.entries()) {
    if (!currentSnapshot.has(relPath)) {
      deleted.push(relPath);
      continue;
    }

    const currentEntry = currentSnapshot.get(relPath)!;
    // Kiểm tra nhanh mtime + size
    if (currentEntry.size !== initialEntry.size || currentEntry.mtime !== initialEntry.mtime) {
      // Nếu lệch, băm SHA-256 để xác thực nội dung thực tế
      const fullPath = path.join(dirPath, relPath);
      const currentHash = computeFileSha256(fullPath);

      // Nếu initialEntry chưa có hash, ta coi như có nghi vấn sửa đổi
      if (!initialEntry.sha256) {
        modified.push(relPath);
      } else if (initialEntry.sha256 !== currentHash) {
        modified.push(relPath);
      }
    }
  }

  // 2. Kiểm tra các file mới phát sinh
  for (const relPath of currentSnapshot.keys()) {
    if (!initialSnapshot.has(relPath)) {
      added.push(relPath);
    }
  }

  const valid = modified.length === 0 && added.length === 0 && deleted.length === 0;

  return {
    valid,
    modified,
    added,
    deleted,
  };
}
