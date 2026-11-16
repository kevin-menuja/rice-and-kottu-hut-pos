// Recovery gate: dump and restore disposable PostgreSQL test data only.
// Refuses non-loopback or non-test database names before creating any database.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

const input = process.env.DATABASE_URL ?? "";
const url = new URL(input);
const sourceName = decodeURIComponent(url.pathname.slice(1));
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname),
  "Recovery test must use a loopback PostgreSQL host");
assert.match(sourceName, /^startek_portfolio_[a-f0-9]{8,}$/,
  "Recovery test requires a disposable portfolio database name");
assert.ok(["postgres:", "postgresql:"].includes(url.protocol));

const restoreName = "startek_restore_" + randomBytes(7).toString("hex");
const adminUrl = new URL(input);
adminUrl.pathname = "/postgres";
const restoreUrl = new URL(input);
restoreUrl.pathname = "/" + restoreName;
const source = new pg.Client({ connectionString: input });
const restored = new pg.Client({ connectionString: restoreUrl.toString() });
const admin = new pg.Client({ connectionString: adminUrl.toString() });
const workdir = await mkdtemp(path.join(os.tmpdir(), "startek-pos-restore-"));
const dumpPath = path.join(workdir, "isolated-test.dump");
process.umask(0o077);

function pgCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 120_000,
    env: {
      ...process.env,
      PGPASSWORD: decodeURIComponent(url.password) || process.env.PGPASSWORD || "",
    },
  });
  assert.equal(result.status, 0, command + " failed with exit code " + (result.status ?? "unknown"));
}
async function facts(client) {
  const tables = ["User", "Order", "OrderItem", "Payment", "Category", "_prisma_migrations"];
  const counts = {};
  for (const table of tables) {
    const { rows } = await client.query('SELECT count(*)::int AS n FROM "' + table + '"');
    counts[table] = rows[0].n;
  }
  const orders = (await client.query(
    'SELECT status, count(*)::int AS n, COALESCE(sum("grandTotal"),0)::text AS total FROM "Order" GROUP BY status ORDER BY status'
  )).rows;
  const payments = (await client.query(
    'SELECT "paymentMethod", "paymentStatus", count(*)::int AS n, COALESCE(sum(amount),0)::text AS total FROM "Payment" GROUP BY "paymentMethod", "paymentStatus" ORDER BY "paymentMethod", "paymentStatus"'
  )).rows;
  const sample = (await client.query(
    'SELECT "orderNumber", status, "grandTotal"::text AS total FROM "Order" ORDER BY "orderNumber" LIMIT 5'
  )).rows;
  const migrations = (await client.query(
    'SELECT migration_name, finished_at IS NOT NULL AS applied, rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations" ORDER BY migration_name'
  )).rows;
  const userRoles = (await client.query(
    'SELECT username, role, status FROM "User" ORDER BY username'
  )).rows;
  return { counts, orders, payments, sample, migrations, userRoles };
}

let created = false;
let adminConnected = false;
try {
  await admin.connect();
  adminConnected = true;
  await source.connect();
  const before = await facts(source);
  assert.ok(before.counts.Order >= 1, "Restore test expects synthetic orders from E2E suite");
  assert.ok(before.counts.Payment >= 1, "Restore test expects synthetic payments");
  const originalAdmin = (await source.query('SELECT password FROM "User" WHERE username = $1', ["admin"])).rows;
  assert.equal(originalAdmin.length, 1, "Test-only source administrator is missing");

  pgCommand("pg_dump", [
    "--host", url.hostname, "--port", url.port || "5432",
    "--username", decodeURIComponent(url.username), "--dbname", sourceName,
    "--format=custom", "--file", dumpPath, "--no-owner", "--no-acl",
  ]);

  await admin.query('CREATE DATABASE "' + restoreName + '"');
  created = true;
  pgCommand("pg_restore", [
    "--host", url.hostname, "--port", url.port || "5432",
    "--username", decodeURIComponent(url.username), "--dbname", restoreName,
    "--no-owner", "--no-privileges", "--exit-on-error", dumpPath,
  ]);

  await restored.connect();
  const after = await facts(restored);
  assert.deepEqual(after, before, "Restore differs in records, totals, users or migrations");
  const { rows } = await restored.query('SELECT password FROM "User" WHERE username = $1', ["admin"]);
  assert.equal(rows.length, 1, "Restored super-admin is missing");
  assert.equal(rows[0].password, originalAdmin[0].password,
    "Restored administrator password hash differs from source");
  if (process.env.SEED_SUPER_ADMIN_PASSWORD) {
    assert.equal(await bcrypt.compare(process.env.SEED_SUPER_ADMIN_PASSWORD, rows[0].password), true,
      "Restored super-admin credentials do not verify");
  }

  console.log("ISOLATED_RESTORE_PASS", JSON.stringify({
    users: before.counts.User,
    orders: before.counts.Order,
    orderItems: before.counts.OrderItem,
    payments: before.counts.Payment,
    categories: before.counts.Category,
    migrations: before.counts._prisma_migrations,
    orderTotals: before.orders,
    paymentTotals: before.payments,
    restoredAdminVerified: true,
  }));
} finally {
  await restored.end().catch(() => {});
  await source.end().catch(() => {});
  if (adminConnected) {
    if (created) {
      await admin.query('DROP DATABASE IF EXISTS "' + restoreName + '" WITH (FORCE)').catch(() => {});
    }
    await admin.end().catch(() => {});
  }
  await rm(workdir, { recursive: true, force: true }).catch(() => {});
}
