export interface SafetyMatch {
  label: string;
  start: number;
  end: number;
  matched: string;
}

export class RegexSafetyFilter {
  private readonly patterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "PHONE", pattern: /(?<!\d)1[3-9]\d{9}(?!\d)/g },
    { label: "IDCARD", pattern: /(?<!\d)[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/g },
    { label: "BANKCARD", pattern: /(?<!\d)[1-9]\d{15,18}(?!\d)/g },
    { label: "EMAIL", pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g },
    { label: "SECRET", pattern: /(?:sk|pk)[\-_][a-zA-Z0-9]{20,}/g },
    { label: "SECRET", pattern: /AKIA[A-Z0-9]{16}/g },
    { label: "SECRET", pattern: /ghp_[a-zA-Z0-9]{36}/g },
    { label: "SECRET", pattern: /xoxb-[a-zA-Z0-9\-]+/g },
    { label: "SECRET", pattern: /(?:password|passwd|pwd|secret|token|api_?key)\s*[:=]\s*\S+/gi }
  ];

  scan(text: string): SafetyMatch[] {
    const matches: SafetyMatch[] = [];
    for (const { label, pattern } of this.patterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        const matched = match[0];
        const start = match.index ?? 0;
        matches.push({ label, start, end: start + matched.length, matched });
      }
    }
    return matches.sort((left, right) => left.start - right.start || right.end - left.end);
  }

  redact(text: string): string {
    const matches = this.scan(text);
    if (matches.length === 0) return text;
    let result = text;
    for (const match of [...matches].sort((left, right) => right.start - left.start)) {
      result = `${result.slice(0, match.start)}[MASK:${match.label}]${result.slice(match.end)}`;
    }
    return result;
  }
}
