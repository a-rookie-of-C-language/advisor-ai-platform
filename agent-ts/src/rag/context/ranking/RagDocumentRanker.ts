export class RagDocumentRanker {
  rank<T extends { fileName: string }>(documents: T[], query: string): T[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return documents;
    }
    const keywords = normalizedQuery.split(/\s+/).filter(Boolean);
    return [...documents].sort((left, right) => this.score(right.fileName, keywords) - this.score(left.fileName, keywords));
  }

  private score(fileName: string, keywords: string[]): number {
    const normalizedName = fileName.toLowerCase();
    return keywords.reduce((score, keyword) => score + (normalizedName.includes(keyword) ? 1 : 0), 0);
  }
}
