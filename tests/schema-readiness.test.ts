import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredSchema } from "../src/lib/schema-readiness";

test("health is ready only when checkout and auth schema contracts exist", () => {
  assert.equal(hasRequiredSchema({ orderItemSnapshotReady: true, loginThrottleReady: true }), true);
  assert.equal(hasRequiredSchema({ orderItemSnapshotReady: false, loginThrottleReady: true }), false);
  assert.equal(hasRequiredSchema({ orderItemSnapshotReady: true, loginThrottleReady: false }), false);
  assert.equal(hasRequiredSchema({ orderItemSnapshotReady: false, loginThrottleReady: false }), false);
  assert.equal(hasRequiredSchema(null), false);
  assert.equal(hasRequiredSchema(undefined), false);
});
