# Startek Restaurant POS — Integrated Phase 2.3–2.8 Hardening Report

**Date:** 14 November 2026
**Repository:** kevin-menuja/startek-restaurant-pos
**Baseline main:** 20e91c3f465cea94c14752ac1f2e5d1b1ecf5359
**Change management:** Isolated Git branches only. NO merge into main, NO Netlify deployment, NO production data modification, NO paid services enabled.

## Executive outcome

Three independent branches were prepared and verified together in a detached,
unpublished integration checkout. The combined checkout passed TypeScript,
ESLint, 36 unit tests, Prisma schema validation, local PostgreSQL migration
tests, atomic login-throttle integration tests, a hermetic Netlify-compatible
cloud build, a standalone local build, and the existing browser POS acceptance
suite on a disposable database with synthetic records.

**Important: this is validated development work, NOT a production release.**

## Branches and exact scope

1. security/phase2-auth-hardening (2fe956461f646c1e2096711ebe6306034d35dc98)
   - PostgreSQL-backed account throttling using HMAC-SHA-256 keyed digests
     derived with AUTH_SECRET; no raw account identities are stored.
   - Canonical User UUID keys prevent login-alias bypass via email/username.
   - Conditional client-IP throttle uses the Netlify platform-injected
     X-Nf-Client-Connection-Ip header only in a trusted hosted runtime.
     Untrusted X-Forwarded-For headers are never used; real Netlify
     forwarding still requires preview verification.
   - Additive AuthLoginThrottle Prisma model and SQL migration.
   - Atomic upsert: 15-minute window; account attempt 8 triggers a
     10-minute block; IP attempt 100 triggers a separate 10-minute block.
     The counter resets after lock expiry, avoiding immediate re-lock.
   - Generic sign-in errors; fail closed on missing throttle storage;
     reset the canonical account counter on successful authentication.
   - Protected, dry-run-by-default cleanup command for stale throttles
     older than 30 days; database-name confirmation required to apply.
   - Unit tests and disposable PostgreSQL integration tests for limits,
     concurrency, lock expiry, window reset, IP hashing and cleanup.
2. security/phase2-http-observability (19d32d41b9c358d965a76d6d8eab42152ea5b676)
   - Global anti-framing and plug-in CSP directives, X-Frame-Options DENY,
     X-Content-Type-Options nosniff, Referrer-Policy and Permissions-Policy.
   - Health-check correlation ID and structured failure-only log event
     restricted to predefined fields, avoiding raw PostgreSQL exception data.
   - Targeted tests for headers and sanitized event records.
3. docs/phase2-recovery-quality (includes e51dbaa3e04a6c845fd127a4f830fce3ca30a04b)
   - Recovery runbook, authentication acceptance criteria, monitoring and
     incident response, risk-based release gates.
   - CI extension: run SQL login-throttle and cleanup dry-run checks only
     if present, against the disposable PostgreSQL job database.
   - Browser suite now asserts no-store health checks, X-Request-ID,
     global anti-framing/CSP headers and unauthenticated redirects.

All three tracks were combined in an uncommitted detached local worktree
by applying their patches, not through any merge into main.

## Workstream status

| ID | Workstream | Evidence | Remaining release gate |
|---|---|---|---|
| 2.3 | Database protection and recovery | Staging snapshot and isolated Neon branch recovery; localhost dump and restore separately verified earlier | Actual Netlify Production database target and encrypted offsite backup NOT verified |
| 2.4 | Authentication hardening | Atomic HMAC-keyed throttle, SQL integration tests, unchanged JWT revocation | Provider-trusted IP abuse controls and migration approval |
| 2.5 | HTTP/API protection | Enforced anti-framing baseline and browser smoke test | Strict script CSP/nonce and broader server-action authorization audit |
| 2.6 | Observability | Readiness request IDs, sanitized failure logs, documented monitoring | No external alert provider configured; verify logs in staging after deployment |
| 2.7 | Quality | 33/33 unit tests, local synthetic E2E, standalone and cloud builds | PR-specific CI before production approval |
| 2.8 | Documentation | Runbooks and consolidated report | Update release records only after final deployment |

## Verified integration test evidence

- Node 22.23.1, npm ci from the checked-in lockfile in a real isolated worktree.
- Prisma schema validation: PASS.
- TypeScript noEmit: PASS.
- ESLint: PASS.
- Unit tests: 36 tests / 36 passed / 0 failed.
- PostgreSQL 18 disposable database: startek_portfolio_6ed3b527ef8687.
- Fresh Prisma migrate deploy and migrate status: PASS.
- Throttle SQL tests: first seven attempts allowed; eighth blocked;
  ninth does not extend the block; expired block and expired window both
  reset correctly; eight simultaneous attempts serialize to exactly eight;
  shared-IP threshold triggers on attempt 100: PASS.
- Throttle retention: dry-run reports only counts, unapproved --apply
  is rejected, and approved cleanup removes an aged synthetic row while
  preserving a recent row: PASS.
- Disposable database seeding: PASS. No production or existing Neon records used.
- Cloud build: npm run build:netlify PASS using unreachable synthetic Neon URL,
  and independent local node_modules installed via npm ci. NO cloud deployment.
- Standalone local build: npm run build PASS, health responded correctly.
- Browser E2E: PASS using a fresh synthetic database. The suite exercised
  login, roles, checkout across cash/card/QR, receipt snapshots, order
  idempotency, exports, disabled user revocation, mobile routes, and local
  backup behavior. It now checks X-Request-ID/no-store on health,
  anti-framing/CSP security headers and anonymous redirect behavior.
- Runtime HTTP test: login HTTP 200 with CSP frame-ancestors none, object-src
  none and base-uri self; X-Frame-Options DENY; nosniff; Referrer-Policy and
  Permissions-Policy. Anonymous dashboard redirected to login: PASS.
- Production dependency audit: 0 vulnerabilities.
- **Final full dependency audit after scoped transitive override: 0 total
  advisories (0 critical/high/moderate/low).**
- Production-only dependency audit: 0 advisories. Earlier 8 moderate
  development dependency advisories were traced to minimatch 10.2.6
  under @typescript-eslint/typescript-estree 8.72.2. A scoped override
  to minimatch 11.0.1 was introduced in the release candidate only.
  Since this crosses a transitive major boundary, a future upstream
  fix should replace the override after QA.

## Production database mapping: UNRESOLVED / CRITICAL

Netlify Production DATABASE_URL and AUTH_SECRET exist, but the CLI returns
masked values (not the hostname). The correct production database project,
branch and endpoint remain UNVERIFIED. A healthy /api/health response proves
only SELECT 1 connectivity, not database identity.

The accessible Neon staging project is ancient-hall-55236885 and includes:
- br-frosty-wildflower-b31fbzs3: staging (root/default).
- br-super-bonus-b3kvbj5v: desktop-original-staging (populated).
- br-green-leaf-b352qrh7: isolated drill copy of populated branch.
- br-crimson-hat-b3n2drfv: verified copy from staging root snapshot.
- snap-icy-haze-b3rhpkan: manual snapshot of staging root ONLY.

**Do not assume ANY listed Neon branch is Netlify Production.**
A previous snapshot restore unintentionally reassigned the project default and
endpoint associations; these branch names and default status were corrected.
Keep future production restore procedures under strict approval and endpoint
mapping checks.

Local backup and restore evidence on the user's Mac applies only to localhost
PostgreSQL, not to the Netlify production database. Never commit local dumps.

## Risks and tradeoffs (ranked)

1. CRITICAL: Production database identity and true encrypted, offsite production
   backup have not been independently verified. No new production migration.
2. HIGH: Targeted or distributed account lockouts remain possible.
   The optional per-IP limit is coded but not verified on Netlify; implement
   trusted platform bot-abuse protection and an authorized unlock process.
3. HIGH: Stale-throttle cleanup is implemented with a manually approved
   dry-run/apply CLI, but no unattended retention schedule or alert is
   configured. Monitor table growth before deploying it to production.
4. HIGH: Monitoring and backup failure alerting are runbooks, not live services.
5. MEDIUM: CSP currently prevents embedding and plug-ins but does not enforce
   a nonce-backed script-src; a future stricter CSP needs browser compatibility
   tests for Auth.js and POS receipt rendering.
6. MEDIUM: Eight moderate development-tooling npm advisories remain.
7. MEDIUM: GitHub CI extensions will only be truly verified after an approved
   pull request runs; this execution intentionally opened no PR or deployment.

## Required release sequence

1. Obtain the exact Netlify Production database hostname and database name
   from its authorized secret manager, and match it to a Neon endpoint without
   disclosing the URI or password.
2. Capture a verified encrypted offsite dump from that exact database,
   checksum it, independently restore it to a new database and validate data.
3. Review and approve the additive throttle migration and the account
   lockout recovery playbook. Verify Netlify's trusted client-IP header in
   preview before relying on that control; stage safe retention scheduling.
4. Review all three Git branches together; create a draft PR only after
   explicitly authorizing Netlify Deploy Preview builds and associated usage.
5. Run fresh GitHub CI, Netlify preview checks, synthetic integration suite,
   production-specific monitoring rehearsal, and security review.
6. Obtain explicit approval to merge/deploy; monitor health, auth and checkout;
   record post-release rollback and incidents. Never rely on a code rollback to
   undo a database migration.

## Proof of nonproduction isolation

The integrated checkout is detached from main and has not been pushed.
The three source branches contain no .env files, SQL dumps or customer records.
The disposable PostgreSQL databases were created on the user's localhost.
No Netlify preview or production deployment was triggered by the work.

## Final consolidated release-candidate validation (14 November 2026)

Consolidated Git branch: security/phase2-release-candidate, forked from
main SHA 20e91c3f465cea94c14752ac1f2e5d1b1ecf5359.

All original authentication, HTTP security and operations/documentation
commits were replayed into one standalone release-candidate worktree
without modifying main or opening a pull request.

- npm ci using Node 22 and the lockfile: PASS.
- npm audit --json after scoped minimatch 11.0.1 override: ZERO advisories,
  including both production and development dependencies.
- npm run typecheck: PASS.
- npm run lint: PASS.
- npm test: 36/36 PASS.
- npx prisma validate: PASS.
- npm run build:netlify with unreachable synthetic DB endpoint: PASS.
- Fresh isolated PostgreSQL 18 database with all migrations: PASS.
- Atomic login throttle SQL and safe dry-run cleanup: PASS.
- Synthetic test database seed and local standalone build: PASS.
- Browser suite (roles, checkout, receipts, exports, session revocation,
  header assertions, local backup workflow): PASS.
- All code-related findings from the initial security review are
  implemented and tested locally, subject to the release gates below.

**NOT APPROVED FOR PRODUCTION:** The consolidated code includes an
additive authentication table migration. Deploying the application without
the corresponding database migration would reject all credential logins.
Conversely, applying that migration without a verified backup and positive
production database identity would be unsafe. No cloud database migration,
Netlify build, PR creation, merge or production deployment was performed.

This branch is a **candidate for review**, not a completed production release.
The free-plan code-based Netlify per-IP rate limiting capability can provide
defense in depth, but no Netlify-managed rate-limit rules have been enabled or
verified; provider rules require an authorized preview/post-processing check.
Official capability reference:
https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/

Outstanding external dependencies:
1. Recover the original live DATABASE_URL *identity* through its authorized
   provider/secret manager, without exposing the connection string.
2. Verify an encrypted offsite backup and isolated restore of precisely
   that live database.
3. Approve the production-safe migration sequence and account lockout
   recovery plan.
4. Explicitly approve preview usage and PR CI, then authorize merge/deploy
   only after runtime Netlify header/rate-limit verification.
5. Configure external alerting with an agreed owner and destination.

## Related runbooks

- docs/operations/PRODUCTION_DATABASE_RECOVERY.md
- docs/operations/AUTHENTICATION_SECURITY.md
- docs/operations/OBSERVABILITY.md
- docs/operations/PHASE2_ACCEPTANCE.md


## Follow-up validation — revised authentication branch

- Authentication branch commit: 2fe956461f646c1e2096711ebe6306034d35dc98.
- Updated documentation/CI test commit: e51dbaa3e04a6c845fd127a4f830fce3ca30a04b.
- Recombined authentication, HTTP and documentation patches in the same
  detached localhost integration checkout. No push to main and no deployment.
- Checks: Prisma validation PASS, TypeScript PASS, ESLint PASS,
  **36 of 36 unit tests PASS**, synthetic Netlify-compatible cloud build PASS.
- A **fresh** local PostgreSQL 18 test database was migrated, tested,
  seeded, built and checked through the full browser suite: PASS.
- The updated E2E checks include X-Request-ID/no-store on health and
  anti-framing CSP on login. No hosted database or live customer records
  were used.
- Latest production DB project/branch mapping remains **UNVERIFIED**.
  Provider-level rate-limit enforcement is **NOT CLAIMED** until Netlify
  previews are explicitly authorized and exercised.

The local source-code and browser checks establish engineering readiness,
not production-release authorization. All release gates still apply.

## Production database identity follow-up (Netlify Secrets Controller)

Read-only Netlify CLI checks confirm that Production DATABASE_URL is configured
but masked. Netlify's Secrets Controller is write-only, including its UI,
CLI and API, after a secret value is configured. No reveal is available.

All five connected Neon endpoints have been mapped and documented in
docs/operations/PRODUCTION_DATABASE_RECOVERY.md. None has been established
as the Netlify Production target. The live database may belong to a
different provider project or account. No production records, credentials,
migrations or deployments were changed.

Identify the original URI privately from the authorized provider source
and record only the host prefix, project/branch and database name.

Official policy: https://docs.netlify.com/build/environment-variables/secrets-controller/


## Final read-only endpoint correlation investigation

On 14 November 2026, a read-only health request to live Netlify Production
coincided with the activation of a Neon snapshot-restored staging branch.
Other candidate endpoints were initially idle. The method was validated
with a separate Deploy Preview: its known Neon preview endpoint activated
at the matching time after a preview health request.

The snapshot-restored branch differs materially from the populated staging
branch: it has fewer completed migrations and lacks the
OrderItem.itemName schema column required by the current application.
This creates a HIGH-PRIORITY potential live-database mismatch.
The exact Netlify production connection string remains masked and cannot
be directly confirmed. Activity correlation is strong evidence, not
cryptographic proof or authorization to change endpoints.

To prevent false-green readiness in future releases, the release candidate
now checks required schema contracts. Missing structures produce HTTP 503
(database=schema_incompatible), redacted structured logging, and an
X-Request-ID. TypeScript, ESLint, 38 of 38 unit tests, and a synthetic
cloud-compatible build passed for this addition.

A final browser E2E rerun for the additional health guard could not be
started through the connected desktop tool in this attempt. The previous
36-test candidate passed the synthetic browser suite; do not claim that
the new health guard has completed browser validation.

Never point production blindly at the populated staging branch, migrate
the suspected snapshot-restored database, or apply a rollback until the
actual production endpoint and intended business data are independently
verified and both relevant states are safely backed up.

Detailed endpoint correlation evidence is intentionally stored in a
PRIVATE user-facing investigation report, rather than adding new
operational identifiers to this public repository.
