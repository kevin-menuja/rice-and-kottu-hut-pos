import assert from "node:assert/strict";
import test from "node:test";
import { assessReadiness, checkHealth } from "../scripts/monitor/verify-health.mjs";

test("monitor requires both database and application readiness", () => {
  assert.deepEqual(assessReadiness(200, { status: "ok", database: "connected" }), { ok: true, reason: "OK" });
  assert.equal(assessReadiness(503, { status: "ok", database: "connected" }).ok, false);
  assert.equal(assessReadiness(200, { status: "error", database: "schema_incompatible" }).ok, false);
  assert.equal(assessReadiness(200, { status: "ok", database: "unavailable" }).ok, false);
  assert.equal(assessReadiness(200, null).ok, false);
});

test("monitor rejects off-domain and insecure URLs", async () => {
  const fake = async () => { throw Error("Should not fetch"); };
  await assert.rejects(() => checkHealth("http://startek-restaurant-pos.netlify.app/api/health", fake), /Refusing/);
  await assert.rejects(() => checkHealth("https://evil.example/api/health", fake), /Refusing/);
  await assert.rejects(() => checkHealth("https://startek-restaurant-pos.netlify.app/api/admin", fake), /Refusing/);
});

test("monitor handles network failures without leaking exceptions", async () => {
  const fake = async () => { throw new Error("sensitive network details"); };
  assert.deepEqual(await checkHealth("https://startek-restaurant-pos.netlify.app/api/health", fake), { ok: false, reason: "NETWORK_UNAVAILABLE" });
});
