import { BooleanStringReader } from "../common/BooleanStringReader.js";

export class AgentBooleanEnvReader {
  read(name: string, defaultValue: boolean): boolean {
    const raw = process.env[name]?.trim().toLowerCase();
    if (!raw) {
      return defaultValue;
    }
    return BooleanStringReader.readTruthy(raw, ["1", "true", "yes", "on"]);
  }
}
