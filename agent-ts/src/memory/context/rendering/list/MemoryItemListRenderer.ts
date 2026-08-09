import type { MemoryItem } from "../../../model/entity/MemoryItem.js";

export class MemoryItemListRenderer {
  constructor(private readonly topK: number) {}

  render(items: MemoryItem[]): string {
    return items
      .filter((item) => item.content?.trim())
      .slice(0, this.topK)
      .map((item, index) => `${index + 1}. ${item.content.trim()}`)
      .join("\n");
  }
}
