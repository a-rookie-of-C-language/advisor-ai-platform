export interface EvalBackendProbeResult {
  readonly available: boolean;
  readonly reason?: string;
}

export class EvalBackendProbe {
  static async probe(baseUrl: string, apiKey: string, model: string): Promise<EvalBackendProbeResult> {
    if (!baseUrl || !apiKey || !model) {
      return { available: false, reason: "missing_config" };
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          temperature: 0,
          stream: false,
          max_tokens: 1
        })
      });
      if (!response.ok) {
        return { available: false, reason: `http_${response.status}` };
      }
      return { available: true };
    } catch (error) {
      return { available: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }
}
