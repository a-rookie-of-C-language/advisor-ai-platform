import { promises as fs } from "node:fs";
import path from "node:path";

export class WorkspaceFileSystem {
  async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  async walk(rootPath: string, includeDirs = false): Promise<string[]> {
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
}
