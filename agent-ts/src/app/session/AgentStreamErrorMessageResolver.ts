export class AgentStreamErrorMessageResolver {
  resolve(error: unknown): string {
    return error instanceof Error ? error.message : "agent stream failed";
  }
}
