import type { JsonObject } from "../../common/json/types/JsonTypes.js";
import type { EvalReport } from "../model/EvalReport.js";

export class EvalReportBuilder {
  static create(datasetName: string, config: JsonObject = {}): EvalReport {
    return {
      meta: {
        timestamp: new Date().toISOString(),
        dataset: datasetName,
        config
      },
      summary: {},
      cases: []
    };
  }

  static addCaseResult(report: EvalReport, caseResult: JsonObject): void {
    report.cases.push(caseResult);
  }

  static computeSummary(report: EvalReport): EvalReport {
    if (report.cases.length === 0) {
      return report;
    }
    const retrieval = EvalReportBuilder.averageMetrics(report.cases, "retrieval", ["recall@5", "mrr", "ndcg@5"]);
    const annotation = EvalReportBuilder.booleanMetrics(report.cases, "annotation", ["type_correct", "authority_correct", "effective_date_correct"]);
    const fusion = EvalReportBuilder.averageMetrics(report.cases, "fusion", ["improvement_rate"]);
    const e2e = EvalReportBuilder.averageMetrics(report.cases, "e2e", ["avg_score", "relevance", "completeness", "accuracy", "fluency"]);
    const deepeval = EvalReportBuilder.averageMetrics(report.cases, "e2e_deepeval", ["avg_score"]);
    const deepevalMetrics = EvalReportBuilder.averageNestedMetrics(report.cases, "e2e_deepeval", [
      "忠实度",
      "答案相关性",
      "上下文精度",
      "上下文召回率",
      "上下文相关性",
      "幻觉检测",
      "偏见检测",
      "毒性检测",
      "隐私泄露检测",
      "相关性",
      "连贯性",
      "完整性"
    ]);
    report.summary = {
      retrieval,
      annotation,
      fusion,
      e2e,
      deepeval: {
        ...deepeval,
        ...deepevalMetrics
      }
    };
    return report;
  }

  private static averageMetrics(cases: JsonObject[], key: string, fields: readonly string[]): JsonObject {
    const result: JsonObject = {};
    for (const field of fields) {
      const values = cases
        .map((entry) => entry[key])
        .filter((value): value is JsonObject => typeof value === "object" && value !== null)
        .map((value) => value[field])
        .filter((value): value is number => typeof value === "number");
      result[field] = values.length > 0 ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : 0;
    }
    return result;
  }

  private static booleanMetrics(cases: JsonObject[], key: string, fields: readonly string[]): JsonObject {
    const result: JsonObject = {};
    for (const field of fields) {
      const values = cases
        .map((entry) => entry[key])
        .filter((value): value is JsonObject => typeof value === "object" && value !== null)
        .map((value) => value[field])
        .filter((value): value is boolean => typeof value === "boolean")
        .map((value) => (value ? 1 : 0));
      const total = values.reduce((sum: number, value: number) => sum + value, 0);
      result[field] = values.length > 0 ? Number((total / values.length).toFixed(4)) : 0;
    }
    return result;
  }

  private static averageNestedMetrics(cases: JsonObject[], key: string, fields: readonly string[]): JsonObject {
    const result: JsonObject = {};
    for (const field of fields) {
      const values = cases
        .map((entry) => entry[key])
        .filter((value): value is JsonObject => typeof value === "object" && value !== null)
        .map((value) => value.metrics)
        .filter((value): value is JsonObject => typeof value === "object" && value !== null)
        .map((value) => value[field])
        .filter((value): value is JsonObject => typeof value === "object" && value !== null)
        .map((value) => value.score)
        .filter((value): value is number => typeof value === "number");
      result[field] = values.length > 0 ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : 0;
    }
    return result;
  }
}
