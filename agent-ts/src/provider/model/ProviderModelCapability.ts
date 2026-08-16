export interface ProviderModelCapability {
  readonly provider: string;
  readonly model: string;
  readonly contextWindowTokens: number;
  readonly supportsTools: boolean;
  readonly supportsReasoning: boolean;
}
