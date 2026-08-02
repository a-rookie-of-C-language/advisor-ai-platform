import type { JsonObject } from "../../common/JsonTypes.js";
import { WorkspaceError } from "../../workspace/model/WorkspaceError.js";

export class AgentHttpJsonObjectFieldReader {
  read(value: unknown, key: string): JsonObject {
    if (value === undefined || value === null) {
      return {};
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new WorkspaceError(`字段必须是 JSON 对象: ${key}`);
    }
    return value as JsonObject;
  }
}
