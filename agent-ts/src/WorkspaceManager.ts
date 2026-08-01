import { promises as fs } from "node:fs";
import path from "node:path";
import { CACHE_DIR, FINAL_DIR, MAX_FILE_SIZE } from "./WorkspaceLimits.js";
import type { WorkspaceListing } from "./WorkspaceListing.js";
import { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import { WorkspaceError } from "./WorkspaceError.js";

export class WorkspaceManager {
  private readonly pathGuard: WorkspacePathGuard;
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    this.pathGuard = new WorkspacePathGuard(this.basePath);
  }

  async read(userId: number | null, sessionId: number | null, relativePath: string, offset = 0, limit = 8192): Promise<string> {
    const targetPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    const stat = await fs.stat(targetPath);
    if (!stat.isFile()) {
      throw new WorkspaceError(`文件不存在: ${relativePath}`);
    }
    if (stat.size > MAX_FILE_SIZE) {
      throw new WorkspaceError(`文件过大（最大 ${MAX_FILE_SIZE} 字节）: ${stat.size}`);
    }

    const content = await fs.readFile(targetPath, "utf8");
    return content.slice(offset, offset + Math.min(limit, MAX_FILE_SIZE));
  }

  async write(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    content: string,
    isFinal = false
  ): Promise<{ path: string; size: number }> {
    const sessionPath = await this.ensureSessionPath(userId, sessionId);
    const normalPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    const targetPath = isFinal ? this.pathGuard.finalPath(sessionPath, relativePath) : normalPath;
    this.pathGuard.checkDepth(sessionPath, targetPath);

    const contentBytes = Buffer.byteLength(content, "utf8");
    if (contentBytes > MAX_FILE_SIZE) {
      throw new WorkspaceError(`内容过大（最大 ${MAX_FILE_SIZE} 字节）`);
    }
    this.pathGuard.checkFileLimit(await this.countWorkingFiles(sessionPath));

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf8");
    return { path: path.relative(sessionPath, targetPath), size: contentBytes };
  }

  async edit(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    oldString: string,
    newString: string,
    isFinal = false
  ): Promise<{ path: string; replaced: boolean }> {
    const sessionPath = this.pathGuard.getSessionPath(userId, sessionId);
    const normalPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    const content = await fs.readFile(normalPath, "utf8");
    if (!content.includes(oldString)) {
      throw new WorkspaceError(`未找到要替换的内容: ${oldString.slice(0, 50)}...`);
    }

    const targetPath = isFinal ? this.pathGuard.finalPath(sessionPath, relativePath) : normalPath;
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content.replace(oldString, newString), "utf8");
    return { path: path.relative(sessionPath, targetPath), replaced: true };
  }

  async list(userId: number | null, sessionId: number | null, relativePath = ".", recursive = false): Promise<WorkspaceListing[]> {
    await this.ensureSessionPath(userId, sessionId);
    const targetPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    return this.buildListing(targetPath, recursive);
  }

  async createDir(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    isFinal = false
  ): Promise<{ path: string; created: boolean }> {
    const sessionPath = await this.ensureSessionPath(userId, sessionId);
    const normalPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    const targetPath = isFinal ? this.pathGuard.finalPath(sessionPath, relativePath) : normalPath;
    this.pathGuard.checkDepth(sessionPath, targetPath);

    await fs.mkdir(targetPath, { recursive: true });
    return { path: path.relative(sessionPath, targetPath), created: true };
  }

  async cleanupCache(userId: number | null, sessionId: number | null): Promise<{ cleaned_files: number; cleaned_size: number }> {
    const sessionPath = this.pathGuard.getSessionPath(userId, sessionId);
    const cachePath = path.join(sessionPath, CACHE_DIR);
    const stats = { cleaned_files: 0, cleaned_size: 0 };
    if (!(await this.exists(cachePath))) {
      return stats;
    }

    for (const filePath of await this.walk(cachePath)) {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        continue;
      }
      stats.cleaned_files += 1;
      stats.cleaned_size += stat.size;
      await fs.unlink(filePath);
    }
    await fs.rm(cachePath, { recursive: true, force: true });
    return stats;
  }

  async getStats(userId: number | null, sessionId: number | null): Promise<Record<string, string | number | null>> {
    const sessionPath = this.pathGuard.getSessionPath(userId, sessionId);
    const stats = {
      user_id: userId,
      session_id: sessionId,
      total_files: 0,
      total_size: 0,
      cache_files: 0,
      cache_size: 0,
      final_files: 0,
      final_size: 0,
      cache_dir: path.join(sessionPath, CACHE_DIR),
      final_dir: path.join(sessionPath, FINAL_DIR)
    };

    if (!(await this.exists(sessionPath))) {
      return stats;
    }

    for (const filePath of await this.walk(sessionPath)) {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        continue;
      }
      if (filePath.split(path.sep).includes(CACHE_DIR)) {
        stats.cache_files += 1;
        stats.cache_size += stat.size;
      } else if (filePath.split(path.sep).includes(FINAL_DIR)) {
        stats.final_files += 1;
        stats.final_size += stat.size;
      } else {
        stats.total_files += 1;
        stats.total_size += stat.size;
      }
    }
    return stats;
  }

  private async ensureSessionPath(userId: number | null, sessionId: number | null): Promise<string> {
    const sessionPath = this.pathGuard.getSessionPath(userId, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });
    return sessionPath;
  }

  private async buildListing(targetPath: string, recursive: boolean): Promise<WorkspaceListing[]> {
    if (!(await this.exists(targetPath))) {
      return [];
    }
    const stat = await fs.stat(targetPath);
    if (stat.isFile()) {
      return [{ name: path.basename(targetPath), type: "file", size: stat.size }];
    }

    const listing: WorkspaceListing[] = [];
    const children = recursive ? await this.walk(targetPath, true) : (await fs.readdir(targetPath)).map((name) => path.join(targetPath, name));
    for (const child of children.sort()) {
      if (child.split(path.sep).includes(CACHE_DIR)) {
        continue;
      }
      const childStat = await fs.stat(child);
      const name = path.relative(targetPath, child) || path.basename(child);
      listing.push(childStat.isFile() ? { name, type: "file", size: childStat.size } : { name, type: "dir" });
    }
    return listing;
  }

  private async countWorkingFiles(sessionPath: string): Promise<number> {
    if (!(await this.exists(sessionPath))) {
      return 0;
    }
    let count = 0;
    for (const filePath of await this.walk(sessionPath)) {
      const parts = filePath.split(path.sep);
      if (!parts.includes(CACHE_DIR) && !parts.includes(FINAL_DIR) && (await fs.stat(filePath)).isFile()) {
        count += 1;
      }
    }
    return count;
  }

  private async walk(rootPath: string, includeDirs = false): Promise<string[]> {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const entryPath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        if (includeDirs) {
          results.push(entryPath);
        }
        results.push(...(await this.walk(entryPath, includeDirs)));
      } else {
        results.push(entryPath);
      }
    }
    return results;
  }

  private async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }
}
