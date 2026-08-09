export class OpenAiToolStringArgumentReader {
  static readRequired(value: unknown, key: string): string {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`缺少必填字段: ${key}`);
    }
    return value.trim();
  }

  static readOptional(value: unknown, fallback: string): string;

  static readOptional(value: unknown, fallback: string | null): string | null;

  static readOptional(value: unknown, fallback: string | null): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }
}
