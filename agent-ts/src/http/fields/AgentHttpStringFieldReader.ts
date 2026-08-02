import { WorkspaceError } from "../../workspace/model/WorkspaceError.js";

export class AgentHttpStringFieldReader {
  readRequired(value: unknown, key: string): string {
    if (typeof value !== "string" || !value) {
      throw new WorkspaceError(`缺少必填字段: ${key}`);
    }
    return value;
  }
}
