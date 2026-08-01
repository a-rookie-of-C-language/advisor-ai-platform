import type { AgentConfig } from "./AgentConfig.js";

export class WebPageHttpClient {
  constructor(private readonly config: AgentConfig) {}

  async fetchHtml(url: URL): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.config.requestTimeoutMs, 10_000));
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "advisor-ai-agent-ts/0.1"
        },
        signal: controller.signal
      });
      if (!response.ok) {
        return null;
      }
      return response.text();
    } finally {
      clearTimeout(timeout);
    }
  }
}
