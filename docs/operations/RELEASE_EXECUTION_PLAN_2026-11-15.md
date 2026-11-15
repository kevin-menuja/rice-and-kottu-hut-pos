# Startek Restaurant POS — Production release execution plan

Status: **NO-GO for merging the Phase 2 authentication/schema release**, pending
the production database identity, off-provider backup and authorized data cutover.
All other implementation work is in draft PR #4.

## A. Verified foundations

- Repository: kevin-menuja/startek-restaurant-pos
- Production branch remains main; published Netlify application returns
  HTTP 200 on /api/health and /login.
- Phase 2 candidate: security/phase2-release-candidate, draft PR #4.
- GitHub CI on PR #4: all three jobs passed before the last monitoring addition;
  rerun CI after each new candidate commit.
- Netlify Deploy Preview #4: /api/health HTTP 200 following an additive
  migration to the isolated Preview database, no customer records changed.
- 41 unit tests, lint, TypeScript and schema tests passed after monitoring
  code. Full checkout/receipt browser suite passed in PR CI.
- npm production and development audits: zero findings in the candidate
  after a scoped, tested minimatch override.
- A stale-order-schema and missing login-throttle-table guard is in the
  candidate: it returns 503 instead of reporting a false-green database.

## B. Data-safety checkpoint (COMPLETED but not off-provider backup)

Two compute-free point-in-time Neon child branches were created within the
existing Free plan for the different candidate source datasets. The suspected
live restored branch and the populated historical staging branch are retained.
Do not delete either branch or the current production deploy during the
release. Branch clones are not independently encrypted off-provider backups.

## C. Release blockers

1. **Authoritative production identity:** Netlify Production DATABASE_URL is
   secret-masked and cannot be read. Earlier controlled readiness requests
   correlated with a restored Neon branch, but activity correlation is not
   definitive evidence of the original intended live database. Inspect the
   authorized source secret record privately. Do not put it in tickets or logs.
2. **Correct business records:** the desktop-original-staging branch was
   created for isolated testing; never import its demo/test records simply
   because it has more orders than the suspected live branch. Determine which
   installation, if any, has actual customer order history and whether a
   migration of real customer data is required.
3. **Encrypted off-provider backup:** dump exactly the verified source
   database with a matching PostgreSQL client, encrypt to a separately
   protected key, record SHA-256, store off-device with retention, and
   perform a restore to a new isolated database. Verify tables, migrations,
   user roles, orders, line items, payment totals and keys.
4. **Production schema migration:** candidate introduces AuthLoginThrottle and
   depends on the OrderItem.itemName column. Never deploy this app version
   against an older schema; Auth.js sign-in can fail closed. Apply migrations
   only through a reviewed sequence targeting the verified live DB.
5. **Operational alerting:** the candidate includes a free GitHub Actions
   readiness monitor. It becomes active only once merged; designate an
   owner for GitHub issue alerts, and test a controlled failure response.

## D. Sequenced release procedure

### Gate 1 — Verify data source (no production writes)
- Match the exact production URL hostname, database name, user and scope to
  a provider endpoint in a trusted vault/console; record only nonsecret IDs.
- Compare DB schema and read-only table counts with the previous live install.
- Confirm whether any of the staging orders are real customer records.
- Obtain the operator's signed GO/NO-GO release approval.

### Gate 2 — Backup and restore drill
- Create an encrypted, independently stored logical backup.
- Verify SHA-256 checksum and archive readability.
- Restore into a separate test database; compare record counts, sums,
  migration state and a sample of orders to the source.
- Produce private backup manifest; do not put dumps or secrets in GitHub.
- Stop if either backup or restore verification fails.

### Gate 3 — Isolated release preview
- Recheck PR #4 GitHub CI and Deploy Preview availability.
- Use only preview database credentials; never copy production credentials.
- Validate credentials login, roles, checkout, payment receipts, exports,
  printer settings, disabled staff revocation, and rate-limit behavior.
- Test the unhealthy schema response (503) in an isolated test database.
- Verify Netlify's injected client-IP header under a trusted preview request.
- Record the prior production Netlify deploy ID and code rollback procedure.

### Gate 4 — Approved deployment
- Notify operators; reduce active order changes during the short maintenance
  window if database migration requires it.
- Run additive migrations on the verified and backed-up production DB only.
- Confirm the migration completed and required columns/tables exist.
- Merge the reviewed PR and watch Netlify production deploy to ready state.
- Immediately test health (200), login, admin read-only page, one synthetic
  checkout ONLY if the business owner approves test transactions in
  production. Otherwise do not create artificial customer orders.
- Verify security headers, trust origin, monitoring and fresh logs.
- Roll back code to the previous Netlify deploy if needed, but do NOT
  blindly roll back database schema or overwrite new orders.

### Gate 5 — Post-release acceptance
- Record SHA, Netlify deploy ID, UTC time, health checks and monitoring URL.
- Confirm a real order/payment with operator approval during business hours.
- Configure and test continuous encrypted off-provider backups and failure
  alerts. Record ownership, retention, and restore drill cadence.
- Establish testable RPO/RTO targets; do not promise targets before drills.
- Enable branch protection and required CI checks from an administrator account
  (the connected CLI user currently lacks repo-admin privileges).
- Keep a full release and incident log with no exposed credentials.

## E. Stop conditions

Stop immediately if any of these occur: unknown live database identity,
a different dataset than expected, no encrypted off-provider backup,
unverified restore, pending or failed migration, unavailable account owner,
Netlify health failure, rate-limit lockout during smoke test, billing or
service-plan change request, or missing ability to roll back application code.

## F. Current conclusion

PR #4 is a **verified preview candidate**, not a completed production release.
It must remain draft until Gates 1–3 are satisfied. This is a deliberate
customer-data safety control, not an unresolved code implementation.
