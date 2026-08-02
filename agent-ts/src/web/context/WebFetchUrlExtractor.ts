export class WebFetchUrlExtractor {
  extract(text: string): string[] {
    const matches = text.match(/https?:\/\/[^\s)）]+/g) || [];
    return [...new Set(matches.map((url) => url.replace(/[.,，。!?！？]+$/, "")))];
  }
}
