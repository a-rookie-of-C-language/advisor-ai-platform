import { writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";
import { EvalDatasetLoader } from "./dataset/EvalDatasetLoader.js";
import { EvalDeepEval } from "./deepeval/EvalDeepEval.js";
import { EvalRunner } from "./runner/EvalRunner.js";
import { EvalJudge } from "./judge/EvalJudge.js";
import { AgentConfig } from "../config/model/core/AgentConfig.js";
import { RagApiClient } from "../rag/api/core/RagApiClient.js";
import { OpenAIChatClient } from "../openai/chat/core/client/OpenAIChatClient.js";

function readArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const value = argv.find((item) => item.startsWith(prefix));
  if (value) return value.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  if (index >= 0) return argv[index + 1];
  return fallback;
}

async function main(): Promise<void> {
  const datasetPath = readArg("dataset");
  if (!datasetPath) {
    throw new Error("missing required argument: --dataset");
  }

  const outputPath = readArg("output", "eval_report.json") ?? "eval_report.json";
  const topK = Number(readArg("top-k", "5") ?? "5");
  const kbIdArg = readArg("kb-id");
  const kbId = kbIdArg ? Number(kbIdArg) : undefined;

  const dataset = await EvalDatasetLoader.load(datasetPath);
  const config = AgentConfig.fromEnv();
  const ragClient = config.ragApiBaseUrl ? new RagApiClient(config) : undefined;
  const openAiClient = config.openAiApiKey ? new OpenAIChatClient(config) : undefined;

  const runner = new EvalRunner(dataset, topK, {
    ragSearch: async (_query, targetKbId, requestedTopK) => {
      if (!ragClient) return [];
      const actualKbId = kbId ?? targetKbId;
      if (!actualKbId || actualKbId <= 0) return [];
      const documents = await ragClient.searchDocuments(actualKbId, _query, requestedTopK);
      return documents.map((document, index) => ({
        chunkId: String(document.id),
        text: document.fileName,
        source: "rag",
        score: Math.max(0, 1 - index * 0.1)
      }));
    },
    getAgentAnswer: async (query, _targetKbId) => {
      if (!openAiClient) return "";
      const messages = [{ role: "user" as const, content: query }];
      const result = await openAiClient.streamChat(messages);
      let answer = "";
      for await (const delta of result) {
        answer += delta;
      }
      return answer;
    },
    judgeE2e: async (query, expectedAnswer, actualAnswer) => EvalJudge.judge(query, expectedAnswer, actualAnswer),
    deepeval: async (query, expectedAnswer, actualAnswer, retrievalContext) =>
      EvalDeepEval.evaluate(query, expectedAnswer, actualAnswer, retrievalContext, {
        model: readArg("deepeval-model") ?? config.openAiModel,
        apiKey: config.openAiApiKey || undefined,
        baseUrl: config.openAiBaseUrl || undefined
      })
  });

  const report = await runner.runAll();
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(`eval report written to ${outputPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  exit(1);
});
