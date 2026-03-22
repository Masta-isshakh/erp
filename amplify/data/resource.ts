import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Company: a
    .model({
      code: a.string().required(),
      nameEn: a.string().required(),
      nameAr: a.string(),
      registrationNumber: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  Branch: a
    .model({
      companyId: a.id().required(),
      code: a.string().required(),
      nameEn: a.string().required(),
      nameAr: a.string(),
      address: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  Warehouse: a
    .model({
      branchId: a.id().required(),
      code: a.string().required(),
      nameEn: a.string().required(),
      nameAr: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  Role: a
    .model({
      code: a.string().required(),
      name: a.string().required(),
      description: a.string(),
      isSystemRole: a.boolean().default(false),
    })
    .authorization((allow) => [allow.authenticated()]),

  Permission: a
    .model({
      key: a.string().required(),
      module: a.string().required(),
      description: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  UserRoleAssignment: a
    .model({
      userId: a.string().required(),
      roleCode: a.string().required(),
      assignedBy: a.string().required(),
      assignedAt: a.datetime().required(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  UnitOfMeasure: a
    .model({
      code: a.string().required(),
      name: a.string().required(),
      precision: a.integer().default(2),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  Item: a
    .model({
      sku: a.string().required(),
      nameEn: a.string().required(),
      nameAr: a.string(),
      category: a.string(),
      defaultUomCode: a.string().required(),
      isTracked: a.boolean().default(true),
      standardCost: a.float().default(0),
      salesPrice: a.float().default(0),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  ItemBarcode: a
    .model({
      itemId: a.id().required(),
      barcode: a.string().required(),
      isPrimary: a.boolean().default(false),
    })
    .authorization((allow) => [allow.authenticated()]),

  Customer: a
    .model({
      code: a.string().required(),
      nameEn: a.string().required(),
      nameAr: a.string(),
      taxNumber: a.string(),
      phone: a.string(),
      email: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  Supplier: a
    .model({
      code: a.string().required(),
      nameEn: a.string().required(),
      nameAr: a.string(),
      taxNumber: a.string(),
      phone: a.string(),
      email: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  ServiceCatalog: a
    .model({
      code: a.string().required(),
      nameEn: a.string().required(),
      nameAr: a.string(),
      defaultPrice: a.float().default(0),
      revenueAccountCode: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  PriceList: a
    .model({
      name: a.string().required(),
      currency: a.string().default("QAR"),
      itemId: a.id(),
      serviceId: a.id(),
      price: a.float().required(),
      effectiveFrom: a.datetime(),
      effectiveTo: a.datetime(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  DocumentSequence: a
    .model({
      scopeType: a.string().required(),
      scopeId: a.id(),
      documentType: a.string().required(),
      prefix: a.string().required(),
      currentNumber: a.integer().default(0),
    })
    .authorization((allow) => [allow.authenticated()]),

  InventoryMovement: a
    .model({
      eventId: a.string().required(),
      movementType: a.enum([
        "RECEIPT",
        "ISSUE",
        "TRANSFER_OUT",
        "TRANSFER_IN",
        "ADJUSTMENT",
        "RETURN",
        "SCRAP",
      ]),
      transactionRef: a.string(),
      companyId: a.id().required(),
      branchId: a.id().required(),
      warehouseId: a.id().required(),
      toWarehouseId: a.id(),
      itemId: a.id().required(),
      quantity: a.float().required(),
      signedQuantity: a.float().required(),
      uomCode: a.string().required(),
      unitCost: a.float().default(0),
      reasonCode: a.string(),
      referenceEventId: a.string(),
      recordedAt: a.datetime().required(),
      recordedBy: a.string().required(),
      sourceChannel: a.string().default("ERP_UI"),
      isReversal: a.boolean().default(false),
      approvalRequired: a.boolean().default(false),
      approvalStatus: a.string().default("NONE"),
    })
    .authorization((allow) => [allow.authenticated()]),

  SalesInvoice: a
    .model({
      invoiceNumber: a.string().required(),
      companyId: a.id().required(),
      branchId: a.id().required(),
      customerId: a.id().required(),
      status: a.enum(["DRAFT", "POSTED", "VOIDED", "REVERSED"]),
      currency: a.string().default("QAR"),
      subtotal: a.float().required(),
      taxAmount: a.float().default(0),
      totalAmount: a.float().required(),
      postedAt: a.datetime(),
      postedBy: a.string(),
      voidReason: a.string(),
      voidedAt: a.datetime(),
      voidedBy: a.string(),
      reversalInvoiceId: a.id(),
    })
    .authorization((allow) => [allow.authenticated()]),

  SalesInvoiceLine: a
    .model({
      salesInvoiceId: a.id().required(),
      itemId: a.id().required(),
      warehouseId: a.id().required(),
      quantity: a.float().required(),
      unitPrice: a.float().required(),
      lineTotal: a.float().required(),
      cogsUnitCost: a.float().default(0),
    })
    .authorization((allow) => [allow.authenticated()]),

  SalesCorrection: a
    .model({
      originalInvoiceId: a.id().required(),
      correctionType: a.enum(["REFUND", "CREDIT_NOTE", "REVERSAL"]),
      reason: a.string().required(),
      approvedBy: a.string(),
      approvedAt: a.datetime(),
      createdBy: a.string().required(),
      createdAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  ServiceInvoice: a
    .model({
      invoiceNumber: a.string().required(),
      companyId: a.id().required(),
      branchId: a.id().required(),
      customerId: a.id().required(),
      serviceId: a.id().required(),
      status: a.enum(["DRAFT", "POSTED", "VOIDED", "REVERSED"]),
      quantity: a.float().default(1),
      unitPrice: a.float().required(),
      subtotal: a.float().required(),
      taxAmount: a.float().default(0),
      totalAmount: a.float().required(),
      postedAt: a.datetime(),
      postedBy: a.string(),
      voidReason: a.string(),
      voidedAt: a.datetime(),
      voidedBy: a.string(),
      reversalServiceInvoiceId: a.id(),
    })
    .authorization((allow) => [allow.authenticated()]),

  ServiceCorrection: a
    .model({
      originalServiceInvoiceId: a.id().required(),
      correctionType: a.enum(["REFUND", "CREDIT_NOTE", "REVERSAL"]),
      reason: a.string().required(),
      approvedBy: a.string(),
      approvedAt: a.datetime(),
      createdBy: a.string().required(),
      createdAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  JournalEntry: a
    .model({
      entryNumber: a.string().required(),
      sourceType: a.string().required(),
      sourceId: a.string().required(),
      companyId: a.id().required(),
      branchId: a.id().required(),
      postingDate: a.datetime().required(),
      periodKey: a.string().required(),
      status: a.enum(["POSTED", "ADJUSTMENT", "REVERSED"]),
      totalDebit: a.float().required(),
      totalCredit: a.float().required(),
      postedBy: a.string().required(),
      reversalEntryId: a.id(),
    })
    .authorization((allow) => [allow.authenticated()]),

  JournalLine: a
    .model({
      journalEntryId: a.id().required(),
      accountCode: a.string().required(),
      description: a.string(),
      debit: a.float().default(0),
      credit: a.float().default(0),
      currency: a.string().default("QAR"),
      referenceId: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  AccountingPeriod: a
    .model({
      periodKey: a.string().required(),
      startsAt: a.datetime().required(),
      endsAt: a.datetime().required(),
      isClosed: a.boolean().default(false),
      closedAt: a.datetime(),
      closedBy: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Employee: a
    .model({
      employeeCode: a.string().required(),
      fullNameEn: a.string().required(),
      fullNameAr: a.string(),
      nationalId: a.string(),
      hireDate: a.datetime(),
      status: a.enum(["ACTIVE", "INACTIVE", "TERMINATED"]),
      bankName: a.string(),
      bankIban: a.string(),
      wpsIdentifier: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  EmployeeContract: a
    .model({
      employeeId: a.id().required(),
      baseSalary: a.float().required(),
      allowances: a.float().default(0),
      deductions: a.float().default(0),
      startsAt: a.datetime().required(),
      endsAt: a.datetime(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  PayrollRun: a
    .model({
      runCode: a.string().required(),
      salaryMonth: a.string().required(),
      status: a.enum(["DRAFT", "APPROVED", "PAID", "EXPORTED"]),
      totalGross: a.float().default(0),
      totalNet: a.float().default(0),
      approvedBy: a.string(),
      approvedAt: a.datetime(),
      exportedAt: a.datetime(),
    })
    .authorization((allow) => [allow.authenticated()]),

  PayrollLine: a
    .model({
      payrollRunId: a.id().required(),
      employeeId: a.id().required(),
      grossAmount: a.float().required(),
      deductionAmount: a.float().default(0),
      netAmount: a.float().required(),
      paymentRef: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  WpsSifExport: a
    .model({
      payrollRunId: a.id().required(),
      salaryMonth: a.string().required(),
      fileName: a.string().required(),
      status: a.enum(["GENERATED", "SUBMITTED", "ACKNOWLEDGED", "REJECTED"]),
      generatedBy: a.string().required(),
      generatedAt: a.datetime().required(),
      checksum: a.string(),
      payload: a.json(),
    })
    .authorization((allow) => [allow.authenticated()]),

  ApprovalAction: a
    .model({
      entityType: a.string().required(),
      entityId: a.string().required(),
      actionType: a.string().required(),
      decision: a.enum(["APPROVED", "REJECTED"]),
      reason: a.string(),
      requestedBy: a.string().required(),
      decidedBy: a.string(),
      decidedAt: a.datetime(),
    })
    .authorization((allow) => [allow.authenticated()]),

  AuditLogEvent: a
    .model({
      eventType: a.string().required(),
      actorId: a.string().required(),
      actorRole: a.string(),
      entityType: a.string().required(),
      entityId: a.string().required(),
      action: a.string().required(),
      eventTimestamp: a.datetime().required(),
      reason: a.string(),
      ipAddress: a.string(),
      userAgent: a.string(),
      payloadSnapshot: a.json(),
      previousHash: a.string(),
      currentHash: a.string().required(),
      isComplianceCritical: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  MociOutboxEvent: a
    .model({
      sourceEntityType: a.string().required(),
      sourceEntityId: a.string().required(),
      eventCategory: a.enum(["INVENTORY", "SALES", "SERVICE", "PAYROLL"]),
      eventTimestamp: a.datetime().required(),
      payloadVersion: a.string().required(),
      payload: a.json().required(),
      status: a.enum(["PENDING", "SENT", "FAILED", "MANUAL_REVIEW"]),
      lastAttemptAt: a.datetime(),
      nextRetryAt: a.datetime(),
      retryCount: a.integer().default(0),
      approvedReplayBy: a.string(),
      approvedReplayAt: a.datetime(),
    })
    .authorization((allow) => [allow.authenticated()]),

  MociDeliveryAttempt: a
    .model({
      outboxEventId: a.id().required(),
      adapterType: a.enum(["REST_API", "SFTP_FILE", "BATCH_FILE"]),
      attemptNumber: a.integer().required(),
      attemptedAt: a.datetime().required(),
      resultStatus: a.enum(["SUCCESS", "FAILED", "TIMEOUT", "REJECTED"]),
      responseCode: a.string(),
      responseMessage: a.string(),
      receiptReference: a.string(),
      latencyMs: a.integer(),
    })
    .authorization((allow) => [allow.authenticated()]),

  InspectionExportRecord: a
    .model({
      exportCode: a.string().required(),
      generatedBy: a.string().required(),
      generatedAt: a.datetime().required(),
      fromDate: a.datetime().required(),
      toDate: a.datetime().required(),
      includedInventory: a.boolean().default(true),
      includedSales: a.boolean().default(true),
      includedServices: a.boolean().default(true),
      includedAudit: a.boolean().default(true),
      includedIntegration: a.boolean().default(true),
      packageSummary: a.json(),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
