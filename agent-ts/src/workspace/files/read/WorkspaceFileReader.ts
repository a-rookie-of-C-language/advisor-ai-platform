import { promises as fs } from "node:fs";
import { MAX_FILE_SIZE } from "../../model/config/WorkspaceLimits.js";
import { WorkspaceError } from "../../model/error/WorkspaceError.js";

export class WorkspaceFileReader {
  async read(targetPath: string, relativePath: string, offset = 0, limit = 8192): Promise<string> {
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
}
