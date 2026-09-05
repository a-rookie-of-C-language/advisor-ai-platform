export interface Skill {
  readonly name: string;
  readonly description: string;
  readonly brief: string;
  readonly systemPrompt: string;
  readonly requiredTools: ReadonlySet<string>;
  readonly priority: number;
  readonly searchHint?: string;
}
