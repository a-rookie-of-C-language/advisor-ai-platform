export class AgentMissingOpenAiApiKeyFallbackGate {
  shouldWrite(openAiApiKey: string, emittedEvent: boolean): boolean {
    return !emittedEvent && !openAiApiKey;
  }
}
