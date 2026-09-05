import { readFile } from "node:fs/promises";
import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { EvalDataset } from "../model/EvalDataset.js";
import type { EvalCase } from "../model/EvalCase.js";

export class EvalDatasetLoader {
  static async load(path: string): Promise<EvalDataset> {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as {
      name?: string;
      kb_id?: number;
      version?: string;
      cases?: Array<{
        id: string;
        query: string;
        tags?: string[];
        expected_chunks?: string[];
        expected_annotation?: JsonObject;
        expected_answer?: string;
      }>;
    };
    const cases: EvalCase[] = (parsed.cases ?? []).map((item) => ({
      id: item.id,
      query: item.query,
      expectedChunks: item.expected_chunks ?? [],
      tags: item.tags ?? [],
      expectedAnnotation: item.expected_annotation ?? null,
      expectedAnswer: item.expected_answer ?? null
    }));
    return {
      name: parsed.name ?? "dataset",
      version: parsed.version ?? "",
      kbId: parsed.kb_id ?? 0,
      cases
    };
  }
}
