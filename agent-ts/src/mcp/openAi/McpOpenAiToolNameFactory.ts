export class McpOpenAiToolNameFactory {
  create(server: string, name: string): string {
    const sanitized = `mcp_${server}_${name}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    return sanitized.slice(0, 64);
  }
}
