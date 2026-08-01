import type { MemoryItem } from "./MemoryItem.js";
import { MemoryItemListRenderer } from "./MemoryItemListRenderer.js";
import type { SessionSummary } from "../common/SessionSummary.js";

export class MemoryPromptRenderer {
  private readonly itemListRenderer: MemoryItemListRenderer;

  constructor(topK: number) {
    this.itemListRenderer = new MemoryItemListRenderer(topK);
  }

  render(summary: SessionSummary | null, coreMemories: MemoryItem[], longTermMemories: MemoryItem[]): string {
    const sections: string[] = [];
    if (summary?.summary) {
      sections.push(`Session summary:\n${summary.summary}`);
    }
    if (coreMemories.length > 0) {
      sections.push(`Core memories:\n${this.itemListRenderer.render(coreMemories)}`);
    }
    if (longTermMemories.length > 0) {
      sections.push(`Relevant memories:\n${this.itemListRenderer.render(longTermMemories)}`);
    }
    return sections.join("\n\n");
  }
}
