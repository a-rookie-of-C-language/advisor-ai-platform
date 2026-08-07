import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkspaceCreateDirResult } from "../../../model/result/mutation/WorkspaceCreateDirResult.js";

export class WorkspaceDirectoryCreator {
  async create(sessionPath: string, targetPath: string): Promise<WorkspaceCreateDirResult> {
    await fs.mkdir(targetPath, { recursive: true });
    return { path: path.relative(sessionPath, targetPath), created: true };
  }
}
