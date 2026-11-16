# Startek Restaurant POS — Production-Readiness Audit and Sign-off

**Audit:** 17 November 2026, Asia/Colombo
**Decision:** **NO-GO; production approval has not been given.**
**Scope:** Existing single-restaurant Rice & Kottu Hut POS. No live payment or customer records altered. No passwords included.

## Candidate and deployment

| Item | Verified result |
| --- | --- |
| Published source | https://github.com/kevin-menuja/startek-restaurant-pos |
| Published commit and branch | e5e8dc65b282c39980bae00cf436af80326d443e, main |
| Netlify site | startek-restaurant-pos; 323bf7b1-a1f8-4fba-902a-d6d31c1a63b8 |
| Live Netlify deploy | 6afa0a2f26b8f0c4658ff6cf; ready since 15 Nov 2026 19:39 UTC |
| Public staging address | https://startek-restaurant-pos.netlify.app |
| Audit branch | audit/production-readiness-2026-11-17 |
| Audited code changes | 2eb90be (unpaid-order completion rejection), 569aba8 (paid cancellation acknowledgement), da60037 (isolated recovery regression) |
| Prior Netlify rollback candidate | 6af80ae5d7f9a6c5749076a7, ready 14 Nov 2026 |
| Unrelated checkout | Startek-pvt-ltd/startek-restaurant-pos at 4e1e5fa is NOT the deployed source. Its vulnerability results do not describe the live release. |

The Netlify context is called production but the actual restaurant production cutover is not approved. Audit commits have not been deployed. Approval must cite the exact final reviewed SHA, not a branch name.

## Executed checks

| Gate | Result | Evidence |
| --- | --- | --- |
| Dependency security | PASS | Full and production npm audit: 0 findings; Next.js 16.4.6; Prisma 7.10.1; Zod 4.6.7 |
| Lint and TypeScript | PASS | npm run lint and npm run typecheck exit 0 |
| Unit and security policy tests | PASS | npm test: 44/44 tests |
| Cloud build | PASS | npm run build:netlify using a generated CI-only secret and deliberately unroutable fake database |
| Local database migrations | PASS | PostgreSQL 16 disposable loopback DB: 23 migrations and seed applied |
| Isolated browser workflow | PASS | Cash, Card, QR, retried checkout, roles, category, expense, reports, cancellation, receipts, backup, mobile POS |
| Checkout idempotency | PASS | Concurrent replay yielded one order and one payment |
| Unpaid order protection | PASS | Pending order refused completed state without recorded paid tender |
| Void/refund distinction | PASS | Paid cancellation needs acknowledgement and retains PAID tender; cancelled order excluded from completed sales |
| Reports and receipt snapshots | PASS | Synthetic exports reconciled; previously issued item name survives subsequent menu rename |
| User permissions | PASS | Cashier report/export restriction, inactive session revocation, logout and role matrix |
| Isolated recovery | PASS | New CI restore test and manual pg_dump / pg_restore: users 4, orders 4, items 3, payments 3, categories 7, migrations 23; matching financial totals |
| Public read-only smoke | PASS | Health and login HTTP 200; unauthenticated protected pages redirect; security headers present |
| Monitoring classification | PASS | Healthy public endpoint; synthetic HTTP 503 and network failure both classified unhealthy |
| SUPER_ADMIN public login | PRIOR EVIDENCE | Previously verified startek-super-admin login and authenticated dashboard; password not reused in this audit |

Initial browser attempt contacted a pre-existing local server on port 3107 and failed login; the proper isolated server on port 34177 passed the complete suite. A separate one-off aggregate SQL command had a quoting typo; corrected queries verified the same source/restore totals. Neither is counted as an application defect.

## Security, data, and operational limitations

- Auth.js uses active user/role checks, hashed passwords, sessionVersion revocation and persisted login throttles. Server actions and protected layouts recheck authorization; tests cover core roles and revocation. Authorization still requires review for future features.
- The application is single-restaurant; multi-tenant isolation was neither implemented nor certified.
- Local repository contains 23 migration directories. Read-only staging snapshot query found 24 applied and zero failed; the extra applied migration was 20261110090000_add_durable_print_queue, originating from a different development line. All 23 local migrations were present. No automatic rollback or deletion is justified.
- The exact Netlify protected Production DATABASE_URL remains write-only/masked. Correlated staging activity is not sufficient to prove the intended restaurant production database identity. An authorized operator must independently match the source vault and Neon endpoint.
- Card/QR actions record tender as PAID but do not confirm processor settlement. There is no demonstrated payment gateway or in-app refund action. Cancellations are NOT refunds. Manual terminal/refund reconciliation or a properly tested integration must be explicitly approved.
- No implemented stock-management UI or checkout-linked stock deduction was found. No order-line amendment workflow was demonstrated. If these are required for launch, they are release scope failures, not passing gates.
- Synthetic recovery and Neon snapshots are not encrypted, independently stored backups of actual customer data.
- Public health monitoring works; real alert delivery, on-call ownership, physical printing, and rollback rehearsal have not been confirmed.

## Release gate decisions and owners

| Gate | State | Owner and evidence needed |
| --- | --- | --- |
| Candidate traceability | PASS locally | Engineer: audited branch, reviewable commits, exact commit for approved deployment |
| Dependency / auth / build security | PASS | Engineer: zero advisory scan, 44 tests, lint, types, build |
| Synthetic checkout and reporting | PASS | Engineer: browser/SQL logs and report reconciliations |
| Disposable backup and restore | PASS | Engineer: restored sample, migrations and totals match |
| Real database identity | PENDING - BLOCKER | Netlify/Neon administrator: privately confirm correct source URL host, branch, DB and record only nonsecret identifiers |
| Encrypted off-provider source backup and restore | PENDING - BLOCKER | DBA: checksum, retention, access controls, UTC manifest, independent restore with order/payment/user validation |
| Migration reconciliation for selected live DB | PENDING - BLOCKER | DBA: verify target and extra print-queue migration, migration approval and status |
| Card/QR settlement, failures, retries | PENDING | Restaurant owner: manual terminal matching SOP or sandbox-tested provider integration |
| Refund and void reconciliation | PENDING | Owner/cashier: documented external refund ledger or in-app implementation and tests |
| Stock movement/deduction | FAIL if inventory required | Product owner: explicitly exclude from v1 or implement and test movement, adjustments and stock protection |
| Order line-item edits | PENDING if required | Product owner: approve immutable paid order policy or implement/edit test |
| Xprinter XP-80T reconnect/reprint | PENDING - BLOCKER | Site operator: paper receipts, cutter/drawer, disconnect/reconnect and proof of correct reprint |
| Monitor alert delivery/on-call | PENDING | Ops/GitHub administrator: controlled issue/notification drill and designated responder |
| Deployment rollback rehearsal | PENDING | Ops: review previous ready Netlify deploy and rehearse in disposable preview |
| Staff UAT and approval | PENDING - BLOCKER | Manager, cashier, restaurant owner, IT: signed result sheet and physical printer evidence |
| Production deployment and post-release smoke | PENDING - NOT AUTHORIZED | Release owner: explicit authorization of exact candidate, then deployment and post-deploy evidence |

## Staff acceptance checklist

Owner: ______  Manager: ______  Cashier: ______  Printer/operator: ______  UTC time: ______

- [ ] Login as cashier, manager and admin; verify restricted staff operations and reports.
- [ ] Make synthetic cash sale; reject insufficient tender; accept exact cash; verify printed receipt and change.
- [ ] Retry the same checkout; verify no duplicate order or payment.
- [ ] Complete sample Card and QR recorded tenders; compare to actual terminal confirmation (no assumed settlement).
- [ ] Cancel a synthetic PAID order with required non-refund acknowledgement; verify cancelled total and separate refund register.
- [ ] Reconcile daily sales, cashier, payment, expense, and item reports with register totals.
- [ ] Confirm disabled staff cannot continue an existing session or export restricted records.
- [ ] Decide and record whether stock movements and order-line editing are included in v1 scope.
- [ ] On physical Xprinter XP-80T, print dine-in cash, takeaway card, delivery QR, multi-item and long-name receipts at 80 mm, scale 100%, no margins, no extra page.
- [ ] Disconnect printer, reconnect, and reprint a saved receipt without recharging or re-checking out; photograph output privately.
- [ ] Verify approved payment refund SOP, backups, escalation contacts and operation after workstation restart.
- [ ] Sign acceptance evidence and owner release authorization.

Signatures (owner / cashier / manager / IT): _______________________________________

## Deployment, smoke and rollback — only after GO

1. Record reviewed full SHA, CI run, isolated preview deployment, current Netlify deploy 6afa0a2f26b8f0c4658ff6cf, business owner and migration plan.
2. Verify exact intended database identity from the private source secret. Take a new encrypted off-device backup; verify checksum and independent restore before touching production.
3. Review additive Prisma migration compatibility. Only with explicit DBA approval, check status and deploy migrations against that confirmed, backed-up database.
4. Approve and merge the exact reviewed candidate. Use npm ci, validated Netlify environment, the guarded scripts/deploy-netlify.sh and Netlify adapter output. Never publish raw .next.
5. Verify published commit_ref matches approved SHA. Run smoke-netlify script against the approved target; confirm correct CSS, logo, JS, health, login, roles, protected exports and error logs.
6. Validate Xprinter physical receipt and duplicate-safe checkout, and reconcile a business-authorized real sale if allowed. Confirm alert delivery and private offsite backups.
7. If code regression occurs, have the incident owner restore the previously recorded ready Netlify deploy. Do not assume code rollback reverts database migrations; never overwrite new customer orders or blindly restore a snapshot.
8. Record incident times, final Netlify deploy ID, full SHA, read-only health and dashboard checks, first completed operational sale, monitoring alerts and signed UAT.
9. Mark complete only after every mandatory gate is PASS and the approved production smoke completes.

**Recommendation:** HOLD the current working site; do not merge/deploy this audit candidate to the business live environment. No production deployment or live customer database write was performed in this audit.
