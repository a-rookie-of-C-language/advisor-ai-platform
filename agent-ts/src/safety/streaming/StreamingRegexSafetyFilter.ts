import { RegexSafetyFilter } from "../regex/RegexSafetyFilter.js";

export class StreamingRegexSafetyFilter {
  private static readonly tailBufferLength = 20;
  private tailBuffer = "";

  constructor(private readonly filter = new RegexSafetyFilter()) {}

  processChunk(chunk: string): string {
    const combined = this.tailBuffer + chunk;
    if (combined.length <= StreamingRegexSafetyFilter.tailBufferLength) {
      this.tailBuffer = combined;
      return "";
    }
    let outputLength = combined.length - StreamingRegexSafetyFilter.tailBufferLength;
    for (const match of this.filter.scan(combined)) {
      if (match.start < outputLength && match.end > outputLength) {
        outputLength = match.start;
      }
    }
    const output = this.filter.redact(combined.slice(0, outputLength));
    this.tailBuffer = combined.slice(outputLength);
    return this.filter.redact(output);
  }

  flush(): string {
    const remaining = this.tailBuffer;
    this.tailBuffer = "";
    return this.filter.redact(remaining);
  }
}
