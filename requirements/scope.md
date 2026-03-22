# Compliance-First ERP Scope (MVP)

## Scope Principle

This MVP is intentionally compliance-first. Features are prioritized by regulatory impact.

## Required by Circular (Must Have)

- Master data for company, branch, warehouse, item, service, and counterparties.
- Continuous inventory ledger with append-only movements.
- Immediate posting for sales and service transactions.
- Controlled corrections using reversal transactions.
- Audit logs for compliance-relevant actions.
- MOCI integration outbox + delivery attempt tracking.
- Compliance dashboard and inspection export artifacts.

## Required for Operational Compliance in Qatar (Must Have)

- Core accounting integration (GL, AR/AP minimum structures).
- HR/payroll base records and WPS SIF export workflow.
- RBAC with least-privilege role model.

## Recommended in MVP (Should Have)

- Multi-warehouse operations and transfer flows.
- Reconciliation views (inventory ledger vs stock-on-hand; transaction vs outbox).
- Approval workflows for voids/corrections/replays.

## Out of Initial MVP (Later Phase)

- Advanced manufacturing/MRP.
- Full procurement lifecycle and supplier portal.
- Deep POS and e-commerce channel integrations.
- Advanced tax engines and BI cubes.

## Compliance Mapping

- Continuous stock registration -> InventoryMovement append-only events.
- Immediate sales/service update -> SalesInvoice and ServiceInvoice immediate event records.
- Electronic integration -> MOCIOutboxEvent + MOCIDeliveryAttempt.
- Anti-tampering -> immutable ledgers, hash-linked audit log events, controlled reversals.
- Inspector documentation -> compliance reports + export pack generation.
