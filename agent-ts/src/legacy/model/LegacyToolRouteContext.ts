export interface LegacyToolRouteContext {
  readonly categories: readonly string[];
  readonly matchedTools: readonly string[];
  readonly matchedBy: string;
  readonly confidence: number;
  readonly educationDomain: boolean;
  readonly preferredTools: readonly string[];
}
