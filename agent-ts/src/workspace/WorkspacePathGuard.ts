import path from "node:path";
import { BINARY_EXTENSIONS, FINAL_DIR, MAX_DEPTH, MAX_FILES_PER_SESSION } from "./WorkspaceLimits.js";
import { WorkspaceError } from "./WorkspaceError.js";

export class WorkspacePathGuard {
  constructor(private readonly basePath: string) {}

  getSessionPath(userId: number | null, sessionId: number | null): string {
    return path.resolve(this.basePath, String(userId || 0), String(sessionId || 0));
  }

  validatePath(userId: number | null, sessionId: number | null, relativePath: string): string {
    const sessionPath = this.getSessionPath(userId, sessionId);
    const targetPath = path.resolve(sessionPath, relativePath || ".");
    if (!this.isInside(targetPath, sessionPath)) {
      throw new WorkspaceError(`路径穿越尝试: ${relativePath}`);
    }

    if (BINARY_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) {
      throw new WorkspaceError(`不支持操作二进制文件: ${path.extname(targetPath)}`);
    }
    return targetPath;
  }

  finalPath(sessionPath: string, relativePath: string): string {
    return path.resolve(sessionPath, FINAL_DIR, relativePath);
  }

  checkDepth(sessionPath: string, targetPath: string): void {
    const relative = path.relative(sessionPath, targetPath);
    if (relative && relative.split(path.sep).length > MAX_DEPTH) {
      throw new WorkspaceError(`目录深度超限（最大 ${MAX_DEPTH} 层）: ${relative}`);
    }
  }

  checkFileLimit(fileCount: number): void {
    if (fileCount >= MAX_FILES_PER_SESSION) {
      throw new WorkspaceError(`文件数量超限（最大 ${MAX_FILES_PER_SESSION} 个）`);
    }
  }

  private isInside(targetPath: string, parentPath: string): boolean {
    const relative = path.relative(parentPath, targetPath);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  }
}
