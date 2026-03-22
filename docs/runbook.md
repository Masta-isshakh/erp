# ERP Operations Runbook

Version: 1.0

## 1. Daily Operations

- Monitor integration dashboard: pending queue, failures, last success timestamp.
- Review compliance exceptions: failed deliveries, unapproved corrections.
- Verify scheduled backup completion.

## 2. Incident Response

### Integration Failure

1. Identify failed MOCIOutboxEvent and latest MociDeliveryAttempt errors.
2. Classify issue (schema, auth, transport, timeout, downstream reject).
3. Correct root cause with approval if payload changes are required.
4. Replay from outbox through controlled retry action.
5. Record incident in audit trail and operations log.

### Data Integrity Alert

1. Freeze affected period/warehouse via operational lock.
2. Run reconciliation report (inventory ledger vs stock-on-hand).
3. Issue correcting reversal transactions with documented reason.
4. Obtain manager approval before reopening operations.

## 3. Backup and Recovery

- Keep scheduled database backups and point-in-time restore where available.
- Test restore workflow at defined intervals.
- Validate outbox replay after restoration to ensure no event loss.

## 4. Security Operations

- Review role and permission changes weekly.
- Alert on suspicious login failures or unauthorized export attempts.
- Enforce least privilege and remove stale access.

## 5. Payroll and WPS

- Close payroll run only after approval.
- Generate WPS SIF export and verify file structure before bank upload.
- Preserve export audit event and hash reference for evidence.

## 6. Inspection Mode Procedure

1. Open Inspection Export in ERP.
2. Select date range and branch/warehouse scope.
3. Generate export pack.
4. Verify package includes ledgers, audit summary, and integration evidence.
5. Deliver package to authorized inspectors.

## 7. SLAs

- Critical integration outage response: within 30 minutes.
- Failed event replay after fix: within 4 hours.
- Compliance evidence export request: within 1 business hour.
