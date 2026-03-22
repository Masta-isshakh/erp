# Qatar Compliance Requirement Pack (Immutable Baseline)

Version: 1.0
Date: 2026-03-22
Status: Approved baseline for implementation.

## 1. MOCI Circular Obligations

The ERP must support these mandatory controls:

- Electronic integration with ministry systems through ERP (or equivalent).
- Continuous registration of inventory quantities.
- Immediate data updates for sales and services when any change occurs.
- Ability to provide required records/documents to inspectors at any time.
- Prevention and detection controls for tampering and false/incorrect information.

Compliance implication:

- Inventory, sales, and services are regulated records, not optional business logs.
- System must preserve traceability and integrity from transaction creation to integration delivery.

## 2. Record Integrity and Anti-Tampering Requirements

- Regulated transactions must be append-only event records.
- Corrections must be posted as reversing/correcting transactions, not destructive edits.
- Audit evidence must capture who, what, when, where, and why.
- Sensitive operations (voids, approvals, role changes, exports, replay) must be auditable.

## 3. Integration Reliability Requirements

- Outbox-style capture of regulated events.
- Delivery attempts must be recorded with status, timestamp, and error reason.
- Retry with backoff and manual intervention queue for repeated failures.
- Integration dashboard must display health (last success, queue depth, failures).

## 4. Accounting Integration Requirements

- Inventory and sales/services must post to accounting traceably.
- Journal postings must be deterministic and reproducible.
- Period closure must be lock-based with controlled adjustments.

## 5. HR/Payroll and WPS Requirements

- Employee and payroll master data management.
- Payroll run with approval workflow.
- Wage Protection System export support through SIF-compatible outputs.

## 6. Data Privacy and Governance (Qatar PDPL Alignment)

- Role-based least privilege access.
- Access logging for sensitive data operations.
- Controlled retention, archival, and evidence export.
- Data minimization in reports and integration payloads where possible.

## 7. Evidence and Inspection Readiness

The ERP must generate an inspection package containing:

- Inventory and sales/services ledgers.
- Audit evidence for regulated changes.
- Integration delivery evidence (attempt logs and acknowledgements).

## 8. Definition of Done

Implementation is considered compliant when:

- Core regulated flows are append-only.
- Every regulated event is traceable: transaction -> audit -> outbox -> delivery attempts.
- Dashboard and reports expose real-time compliance status and historical evidence.
- Inspection pack can be generated on demand.
