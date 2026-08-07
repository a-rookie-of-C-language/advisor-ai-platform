import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkspaceFileSystem } from "../core/WorkspaceFileSystem.js";
import { CACHE_DIR } from "../../model/config/WorkspaceLimits.js";
import type { WorkspaceListing } from "../../model/result/read/WorkspaceListing.js";

export class WorkspaceListingBuilder {
  constructor(private readonly fileSystem: WorkspaceFileSystem) {}

  async build(targetPath: string, recursive: boolean): Promise<WorkspaceListing[]> {
    if (!(await this.fileSystem.exists(targetPath))) {
      return [];
    }
    const stat = await fs.stat(targetPath);
    if (stat.isFile()) {
      return [{ name: path.basename(targetPath), type: "file", size: stat.size }];
    }

    const listing: WorkspaceListing[] = [];
    const children = recursive
      ? await this.fileSystem.walk(targetPath, true)
      : (await fs.readdir(targetPath)).map((name) => path.join(targetPath, name));
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
}
