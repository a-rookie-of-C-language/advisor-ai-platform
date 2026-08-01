import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkspaceFileSystem } from "./WorkspaceFileSystem.js";
import { CACHE_DIR, FINAL_DIR } from "./WorkspaceLimits.js";

export class WorkspaceWorkingFileCounter {
  constructor(private readonly fileSystem: WorkspaceFileSystem) {}

  async count(sessionPath: string): Promise<number> {
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
