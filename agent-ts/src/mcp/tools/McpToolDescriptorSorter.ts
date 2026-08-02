import type { McpToolDescriptor } from "./model/McpToolDescriptor.js";

export class McpToolDescriptorSorter {
  sort(tools: McpToolDescriptor[]): McpToolDescriptor[] {
    return tools.sort((left, right) => `${left.server}:${left.name}`.localeCompare(`${right.server}:${right.name}`));
  }
}
