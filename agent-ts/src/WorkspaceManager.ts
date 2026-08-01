import { promises as fs } from "node:fs";
import path from "node:path";
import { CACHE_DIR, FINAL_DIR, MAX_FILE_SIZE } from "./WorkspaceLimits.js";
import type { WorkspaceListing } from "./WorkspaceListing.js";
import { WorkspaceFileSystem } from "./WorkspaceFileSystem.js";
import { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import { WorkspaceError } from "./WorkspaceError.js";
import type { WorkspaceStats } from "./WorkspaceStats.js";
import { WorkspaceStatsCollector } from "./WorkspaceStatsCollector.js";

export class WorkspaceManager {
  private readonly fileSystem = new WorkspaceFileSystem();
  private readonly listingBuilder = new WorkspaceListingBuilder(this.fileSystem);
  private readonly statsCollector = new WorkspaceStatsCollector(this.fileSystem);
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
    return this.listingBuilder.build(targetPath, recursive);
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
    if (!(await this.fileSystem.exists(cachePath))) {
      return stats;
    }

    for (const filePath of await this.fileSystem.walk(cachePath)) {
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

  async getStats(userId: number | null, sessionId: number | null): Promise<WorkspaceStats> {
    const sessionPath = this.pathGuard.getSessionPath(userId, sessionId);
    return this.statsCollector.collect(sessionPath, userId, sessionId);
  }

  private async ensureSessionPath(userId: number | null, sessionId: number | null): Promise<string> {
    const sessionPath = this.pathGuard.getSessionPath(userId, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });
    return sessionPath;
  }

  private async countWorkingFiles(sessionPath: string): Promise<number> {
    if (!(await this.fileSystem.exists(sessionPath))) {
      return 0;
    }
    let count = 0;
    for (const filePath of await this.fileSystem.walk(sessionPath)) {
      const parts = filePath.split(path.sep);
      if (!parts.includes(CACHE_DIR) && !parts.includes(FINAL_DIR) && (await fs.stat(filePath)).isFile()) {
        count += 1;
      }
    }
    return count;
  }

}
