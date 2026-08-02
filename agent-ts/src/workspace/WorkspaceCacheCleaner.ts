import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkspaceCacheCleanupResult } from "./model/WorkspaceCacheCleanupResult.js";
import type { WorkspaceFileSystem } from "./files/WorkspaceFileSystem.js";
import { CACHE_DIR } from "./model/WorkspaceLimits.js";

export class WorkspaceCacheCleaner {
  constructor(private readonly fileSystem: WorkspaceFileSystem) {}

  async clean(sessionPath: string): Promise<WorkspaceCacheCleanupResult> {
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
}
