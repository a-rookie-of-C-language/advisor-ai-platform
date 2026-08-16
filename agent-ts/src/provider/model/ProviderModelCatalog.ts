import type { ProviderModelCapability } from "./ProviderModelCapability.js";

export class ProviderModelCatalog {
  private readonly entries = new Map<string, ProviderModelCapability>();

  register(capability: ProviderModelCapability): void {
    this.entries.set(this.key(capability.provider, capability.model), capability);
  }

  list(provider: string): ProviderModelCapability[] {
    return [...this.entries.values()].filter((entry) => entry.provider === provider);
  }

  resolve(provider: string, model: string): ProviderModelCapability | undefined {
    const exact = this.entries.get(this.key(provider, model));
    if (exact) return exact;

    return this.list(provider)
      .filter((entry) => entry.model.endsWith("*") && model.startsWith(entry.model.slice(0, -1)))
      .sort((left, right) => right.model.length - left.model.length)[0];
  }

  private key(provider: string, model: string): string {
    return `${provider}\u0000${model}`;
  }
}
