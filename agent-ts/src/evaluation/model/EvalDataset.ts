import type { EvalCase } from "./EvalCase.js";

export interface EvalDataset {
  readonly name: string;
  readonly version: string;
  readonly kbId: number;
  readonly cases: readonly EvalCase[];
}
