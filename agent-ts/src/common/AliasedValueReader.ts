export class AliasedValueReader {
  static read(source: Record<string, unknown>, snakeKey: string): unknown {
    const camelKey = snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return source[snakeKey] ?? source[camelKey];
  }
}
