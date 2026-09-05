import { AgentEnvReader } from "../env/core/AgentEnvReader.js";
import type { EvalConfigValues } from "../model/values/EvalConfigValues.js";

export class EvalConfigFactory {
  constructor(private readonly envReader = new AgentEnvReader()) {}

  fromEnv(): EvalConfigValues {
    return {
      model: this.envReader.readString("EVAL_LLM_MODEL", "").trim() || this.envReader.readString("OPENAI_MODEL", "gpt-4.1-mini"),
      apiKey: this.envReader.readString("EVAL_LLM_API_KEY", "").trim() || this.envReader.readString("OPENAI_API_KEY", ""),
      baseUrl: this.envReader.readTrimmedUrl("EVAL_LLM_BASE_URL", "") || this.envReader.readTrimmedUrl("OPENAI_BASE_URL", "https://api.openai.com/v1")
    };
  }
}
