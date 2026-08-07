import type { WorkspaceFileEditor } from "../../files/WorkspaceFileEditor.js";
import type { WorkspaceEditResult } from "../../model/result/WorkspaceEditResult.js";
import type { WorkspaceTargetPathResolver } from "../../path/WorkspaceTargetPathResolver.js";

export class WorkspaceEditService {
  constructor(
    private readonly fileEditor: WorkspaceFileEditor,
    private readonly targetPathResolver: WorkspaceTargetPathResolver
  ) {}

  async edit(
    userId: number | null,
    sessionId: number | null,
    relativePath: string,
    oldString: string,
    newString: string,
    isFinal = false
  ): Promise<WorkspaceEditResult> {
    const target = this.targetPathResolver.resolveExistingTarget(userId, sessionId, relativePath, isFinal);
    return this.fileEditor.edit(target.sessionPath, target.normalPath, target.targetPath, oldString, newString);
  }
}
