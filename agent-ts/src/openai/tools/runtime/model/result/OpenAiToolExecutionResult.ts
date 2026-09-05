export interface OpenAiToolExecutionResult {
  output: string;
  success: boolean;
  attempt?: number;
}
