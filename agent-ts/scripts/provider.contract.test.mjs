import assert from "node:assert/strict";
import test from "node:test";
import { ProviderError } from "../dist/provider/model/ProviderError.js";
import { ProviderRetryPolicy } from "../dist/provider/model/ProviderRetryPolicy.js";

test("provider error codes drive retry policy without parsing messages", () => {
  const policy = new ProviderRetryPolicy(3, 100, 250);
  const transient = new ProviderError("TRANSPORT", "connection refused");
  const auth = new ProviderError("AUTH", "invalid credential");
  assert.equal(policy.allowsRetry(1, transient, false), true);
  assert.equal(policy.allowsRetry(1, transient, true), false);
  assert.equal(policy.allowsRetry(1, auth, false), false);
  assert.equal(policy.delayMs(3), 250);
});
