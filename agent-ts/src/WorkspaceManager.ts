import { promises as fs } from "node:fs";
import path from "node:path";
import { WorkspaceCacheCleaner } from "./WorkspaceCacheCleaner.js";
import type { WorkspaceCacheCleanupResult } from "./WorkspaceCacheCleanupResult.js";
import { WorkspaceFileReader } from "./WorkspaceFileReader.js";
import { WorkspaceFileWriter } from "./WorkspaceFileWriter.js";
import type { WorkspaceListing } from "./WorkspaceListing.js";
import { WorkspaceFileSystem } from "./WorkspaceFileSystem.js";
import { WorkspaceListingBuilder } from "./WorkspaceListingBuilder.js";
import { WorkspacePathGuard } from "./WorkspacePathGuard.js";
import { WorkspaceError } from "./WorkspaceError.js";
import type { WorkspaceStats } from "./WorkspaceStats.js";
import { WorkspaceStatsCollector } from "./WorkspaceStatsCollector.js";
import { WorkspaceWorkingFileCounter } from "./WorkspaceWorkingFileCounter.js";
import type { WorkspaceWriteResult } from "./WorkspaceWriteResult.js";

export class WorkspaceManager {
  private readonly fileSystem = new WorkspaceFileSystem();
  private readonly cacheCleaner = new WorkspaceCacheCleaner(this.fileSystem);
  private readonly fileReader = new WorkspaceFileReader();
  private readonly fileWriter = new WorkspaceFileWriter();
  private readonly listingBuilder = new WorkspaceListingBuilder(this.fileSystem);
  private readonly statsCollector = new WorkspaceStatsCollector(this.fileSystem);
  private readonly workingFileCounter = new WorkspaceWorkingFileCounter(this.fileSystem);
  private readonly pathGuard: WorkspacePathGuard;
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    this.pathGuard = new WorkspacePathGuard(this.basePath);
  }

  async read(userId: number | null, sessionId: number | null, relativePath: string, offset = 0, limit = 8192): Promise<string> {
    const targetPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    return this.fileReader.read(targetPath, relativePath, offset, limit);
  }

  async write(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    content: string,
    isFinal = false
  ): Promise<WorkspaceWriteResult> {
    const sessionPath = await this.ensureSessionPath(userId, sessionId);
    const normalPath = this.pathGuard.validatePath(userId, sessionId, relativePath);
    const targetPath = isFinal ? this.pathGuard.finalPath(sessionPath, relativePath) : normalPath;
    this.pathGuard.checkDepth(sessionPath, targetPath);
    this.pathGuard.checkFileLimit(await this.workingFileCounter.count(sessionPath));

    return this.fileWriter.write(sessionPath, targetPath, content);
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

  async cleanupCache(userId: number | null, sessionId: number | null): Promise<WorkspaceCacheCleanupResult> {
    const sessionPath = this.pathGuard.getSessionPath(userId, sessionId);
    return this.cacheCleaner.clean(sessionPath);
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

}
