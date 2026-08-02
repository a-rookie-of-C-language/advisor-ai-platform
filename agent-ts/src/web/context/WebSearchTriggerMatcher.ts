export class WebSearchTriggerMatcher {
  matches(text: string): boolean {
    return Boolean(text) && !this.containsUrl(text) && this.looksLikeSearch(text);
  }

  private containsUrl(text: string): boolean {
    return /https?:\/\//i.test(text);
  }

  private looksLikeSearch(text: string): boolean {
    return /最新|现在|今日|实时|新闻|搜索|查一下|找一下|latest|current|recent|news|search|find|lookup|price|pricing/i.test(text);
  }
}
