import assert from "node:assert/strict";
import test from "node:test";
import { EvalConfigFactory } from "../dist/config/factory/EvalConfigFactory.js";

test("eval config prefers dedicated env over openai env", () => {
  const original = {
    EVAL_LLM_MODEL: process.env.EVAL_LLM_MODEL,
    EVAL_LLM_API_KEY: process.env.EVAL_LLM_API_KEY,
    EVAL_LLM_BASE_URL: process.env.EVAL_LLM_BASE_URL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL
  };
  try {
    process.env.EVAL_LLM_MODEL = "eval-model";
    process.env.EVAL_LLM_API_KEY = "eval-key";
    process.env.EVAL_LLM_BASE_URL = "https://eval.example.com/v1";
    process.env.OPENAI_MODEL = "openai-model";
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.OPENAI_BASE_URL = "https://openai.example.com/v1";

    const config = new EvalConfigFactory().fromEnv();
    assert.equal(config.model, "eval-model");
    assert.equal(config.apiKey, "eval-key");
    assert.equal(config.baseUrl, "https://eval.example.com/v1");
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
