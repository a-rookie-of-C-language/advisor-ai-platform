export interface FailureMemoryItem {
  readonly timestamp: string;
  readonly userQuery: string;
  readonly sessionId?: string;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly avoidStrategy: string;
}
