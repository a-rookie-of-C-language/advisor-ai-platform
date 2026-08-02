import { BooleanStringReader } from "../../common/value/BooleanStringReader.js";
import { WorkspaceError } from "../../workspace/model/WorkspaceError.js";

export class AgentHttpBooleanFieldReader {
  read(value: unknown, key: string, fallback: boolean): boolean {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      return this.readQuery(value, fallback);
    }
    throw new WorkspaceError(`字段必须是布尔值: ${key}`);
  }

  readQuery(value: string | null, fallback: boolean): boolean {
    if (!value) {
      return fallback;
    }
    return BooleanStringReader.readTruthy(value, ["1", "true", "yes", "y"]);
  }
}
