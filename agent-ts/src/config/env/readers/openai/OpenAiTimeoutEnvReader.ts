export class OpenAiTimeoutEnvReader {
  read(): number {
    const timeoutMs = process.env.OPENAI_TIMEOUT_MS?.trim();
    if (timeoutMs) {
      return Number.parseInt(timeoutMs, 10);
    }
    const timeoutSec = process.env.OPENAI_TIMEOUT_SEC?.trim();
    if (timeoutSec) {
      return Math.round(Number.parseFloat(timeoutSec) * 1000);
    }
    return 600_000;
  }
}
