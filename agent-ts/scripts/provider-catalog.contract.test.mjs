import assert from "node:assert/strict";
import test from "node:test";
import { ProviderModelCatalog } from "../dist/provider/model/ProviderModelCatalog.js";

const model = (name, contextWindowTokens) => ({
  provider: "openai",
  model: name,
  contextWindowTokens,
  supportsTools: true,
  supportsReasoning: false
});

test("provider model catalog resolves exact models before prefixes", () => {
  const catalog = new ProviderModelCatalog();
  catalog.register(model("gpt-4*", 16_000));
  catalog.register(model("gpt-4.1", 128_000));
  assert.equal(catalog.resolve("openai", "gpt-4.1")?.contextWindowTokens, 128_000);
  assert.equal(catalog.resolve("openai", "gpt-4o-mini")?.contextWindowTokens, 16_000);
  assert.equal(catalog.resolve("openai", "unknown"), undefined);
});
