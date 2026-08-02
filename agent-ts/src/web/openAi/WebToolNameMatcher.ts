export class WebToolNameMatcher {
  matches(toolName: string, options: { webFetchEnabled: boolean; webSearchEnabled: boolean }): boolean {
    return (toolName === "web_fetch" && options.webFetchEnabled) || (toolName === "web_search" && options.webSearchEnabled);
  }
}
