import type { MemoryItem } from "./MemoryItem.js";
import type { SessionSummary } from "../common/SessionSummary.js";

export class MemoryPromptRenderer {
  constructor(private readonly topK: number) {}

  render(summary: SessionSummary | null, coreMemories: MemoryItem[], longTermMemories: MemoryItem[]): string {
    const sections: string[] = [];
    if (summary?.summary) {
      sections.push(`Session summary:\n${summary.summary}`);
    }
    if (coreMemories.length > 0) {
      sections.push(`Core memories:\n${this.renderMemoryItems(coreMemories)}`);
    }
    if (longTermMemories.length > 0) {
      sections.push(`Relevant memories:\n${this.renderMemoryItems(longTermMemories)}`);
    }
    return sections.join("\n\n");
  }

  private renderMemoryItems(items: MemoryItem[]): string {
    return items
      .filter((item) => item.content?.trim())
      .slice(0, this.topK)
      .map((item, index) => `${index + 1}. ${item.content.trim()}`)
      .join("\n");
  }
}
