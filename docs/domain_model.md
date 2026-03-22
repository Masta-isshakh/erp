# Domain Model (Amplify Gen2 Compliance-First ERP)

## Design Notes

- Backend platform: AWS Amplify Gen2 Data (managed API + storage model).
- Persistence model: append-only transaction entities for regulated flows.
- Inventory/sales/services corrections are reversal events, not in-place edits.
- Every regulated entity includes traceability fields for compliance evidence.

## Core Entities

Master data:

- Company
- Branch
- Warehouse
- Item
- ItemBarcode
- UnitOfMeasure
- Customer
- Supplier
- ServiceCatalog
- PriceList
- DocumentSequence

Security/governance:

- Role
- Permission
- UserRoleAssignment
- ApprovalAction
- AuditLogEvent (append-only + hash link)

Operations:

- InventoryMovement (append-only)
- SalesInvoice
- SalesInvoiceLine
- SalesCorrection
- ServiceInvoice
- ServiceCorrection

Finance:

- JournalEntry
- JournalLine
- AccountingPeriod

HR/Payroll:

- Employee
- EmployeeContract
- PayrollRun
- PayrollLine
- WpsSifExport

Regulatory integration:

- MociOutboxEvent
- MociDeliveryAttempt

Reporting/evidence:

- InspectionExportRecord

## Traceability Chain

Each regulated transaction should map through these links:

- sourceTransactionId (operation)
- audit log event chain (hash linked)
- moci outbox event (normalized payload)
- moci delivery attempts (status, timestamp, errors)

## Correction Model

- Original transactions stay immutable.
- Corrections create reversal entities referencing original document IDs.
- ApprovalAction entries capture who approved and why.

## Computed Views in UI

- Stock on hand = sum(inventory movements by item/warehouse with signed quantities).
- Integration health = pending outbox count, failed attempts, last success timestamp.
- Compliance posture = percent of regulated docs with successful outbox deliveries.
