export class AgentHttpErrorMessageResolver {
  resolve(error: unknown): string {
    return error instanceof Error ? error.message : "internal error";
  }
}
