import { WorkspaceError } from "../../workspace/WorkspaceError.js";

export class AgentHttpNumberFieldReader {
  read(value: unknown, key: string, fallback: number): number {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) {
      throw new WorkspaceError(`字段必须是数字: ${key}`);
    }
    return parsed;
  }
}
