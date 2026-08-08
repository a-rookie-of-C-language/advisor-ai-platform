import { promises as fs } from "node:fs";
import path from "node:path";
import { MAX_FILE_SIZE } from "../../../model/config/WorkspaceLimits.js";
import { WorkspaceError } from "../../../model/error/WorkspaceError.js";
import type { WorkspaceWriteResult } from "../../../model/result/mutation/file/write/WorkspaceWriteResult.js";

export class WorkspaceFileWriter {
  async write(sessionPath: string, targetPath: string, content: string): Promise<WorkspaceWriteResult> {
    const contentBytes = Buffer.byteLength(content, "utf8");
    if (contentBytes > MAX_FILE_SIZE) {
      throw new WorkspaceError(`内容过大（最大 ${MAX_FILE_SIZE} 字节）`);
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf8");
    return { path: path.relative(sessionPath, targetPath), size: contentBytes };
  }
}
