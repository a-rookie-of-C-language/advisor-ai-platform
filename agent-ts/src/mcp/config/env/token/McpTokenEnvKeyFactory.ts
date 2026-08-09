export class McpTokenEnvKeyFactory {
  create(serverName: string): string {
    return `MCP_TOKEN_${serverName.toUpperCase().replaceAll("-", "_")}`;
  }
}
