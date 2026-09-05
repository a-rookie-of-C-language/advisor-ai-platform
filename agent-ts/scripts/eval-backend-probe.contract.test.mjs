import assert from "node:assert/strict";
import test from "node:test";
import { EvalBackendProbe } from "../dist/evaluation/probe/EvalBackendProbe.js";

test("eval backend probe reports missing config as unavailable", async () => {
  const result = await EvalBackendProbe.probe("", "", "");
  assert.equal(result.available, false);
  assert.equal(result.reason, "missing_config");
});

test("eval backend probe reports non-2xx as unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 402 });
  try {
    const result = await EvalBackendProbe.probe("https://example.com/v1", "key", "model");
    assert.equal(result.available, false);
    assert.equal(result.reason, "http_402");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
