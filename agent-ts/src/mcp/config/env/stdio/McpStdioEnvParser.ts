export class McpStdioEnvParser {
  parse(rawEnv: string | undefined = process.env.MCP_STDIO_ENV): Record<string, string> | undefined {
    if (!rawEnv?.trim()) {
      return undefined;
    }

    const env: Record<string, string> = {};
    for (const item of rawEnv.trim().split(/\s+/)) {
      const separatorIndex = item.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      env[item.slice(0, separatorIndex)] = item.slice(separatorIndex + 1);
    }
    return Object.keys(env).length > 0 ? env : undefined;
  }
}
