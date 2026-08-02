import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkspaceFileSystem } from "../files/WorkspaceFileSystem.js";
import { CACHE_DIR, FINAL_DIR } from "../model/WorkspaceLimits.js";
import type { WorkspaceStats } from "../model/WorkspaceStats.js";

export class WorkspaceStatsCollector {
  constructor(private readonly fileSystem: WorkspaceFileSystem) {}

  async collect(sessionPath: string, userId: number | null, sessionId: number | null): Promise<WorkspaceStats> {
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

    if (!(await this.fileSystem.exists(sessionPath))) {
      return stats;
    }

    for (const filePath of await this.fileSystem.walk(sessionPath)) {
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
}
