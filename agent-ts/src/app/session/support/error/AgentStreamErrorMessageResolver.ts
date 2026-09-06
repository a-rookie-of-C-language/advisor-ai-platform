export class AgentStreamErrorMessageResolver {
  resolve(error: unknown): string {
    void error;
    return "服务内部错误，请稍后重试";
  }
}
