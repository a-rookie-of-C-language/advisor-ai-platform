import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FailureMemoryItem } from "../model/FailureMemoryItem.js";

export class FailureMemoryStore {
  constructor(private readonly filePath: string) {}

  append(item: FailureMemoryItem): void {
    const parent = dirname(this.filePath);
    if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(item)}\n`, "utf8");
  }

  loadRecent(limit = 200): FailureMemoryItem[] {
    if (!existsSync(this.filePath)) return [];
    const lines = readFileSync(this.filePath, "utf8").split(/\r?\n/u).filter(Boolean).reverse();
    const result: FailureMemoryItem[] = [];
    for (const line of lines) {
      try {
        result.push(JSON.parse(line) as FailureMemoryItem);
      } catch {
        // Ignore a truncated or manually edited JSONL record.
      }
      if (result.length >= limit) break;
    }
    return result;
  }
}
