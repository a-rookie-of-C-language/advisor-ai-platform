import { promises as fs } from "node:fs";
import path from "node:path";
import { WorkspaceError } from "../../../model/error/WorkspaceError.js";
import type { WorkspaceEditResult } from "../../../model/result/mutation/file/edit/WorkspaceEditResult.js";

export class WorkspaceFileEditor {
  async edit(
    sessionPath: string,
    normalPath: string,
    targetPath: string,
    oldString: string,
    newString: string
  ): Promise<WorkspaceEditResult> {
    const content = await fs.readFile(normalPath, "utf8");
    if (!content.includes(oldString)) {
      throw new WorkspaceError(`未找到要替换的内容: ${oldString.slice(0, 50)}...`);
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content.replace(oldString, newString), "utf8");
    return { path: path.relative(sessionPath, targetPath), replaced: true };
  }
}
