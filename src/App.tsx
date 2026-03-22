import { useEffect, useMemo, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./App.css";

const client = generateClient<Schema>();

type TabKey =
  | "dashboard"
  | "master"
  | "inventory"
  | "sales"
  | "services"
  | "finance"
  | "payroll"
  | "integration"
  | "inspection";

const CURRENT_USER = "erp.user@local";

function nowIso(): string {
  return new Date().toISOString();
}

function hashText(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash)}`;
}

function downloadText(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function signedQty(type: string, quantity: number): number {
  if (["RECEIPT", "TRANSFER_IN", "RETURN"].includes(type)) {
    return Math.abs(quantity);
  }
  return -Math.abs(quantity);
}

function App() {
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [message, setMessage] = useState<string>("");

  const [companies, setCompanies] = useState<Array<Schema["Company"]["type"]>>([]);
  const [branches, setBranches] = useState<Array<Schema["Branch"]["type"]>>([]);
  const [warehouses, setWarehouses] = useState<Array<Schema["Warehouse"]["type"]>>([]);
  const [items, setItems] = useState<Array<Schema["Item"]["type"]>>([]);
  const [customers, setCustomers] = useState<Array<Schema["Customer"]["type"]>>([]);
  const [services, setServices] = useState<Array<Schema["ServiceCatalog"]["type"]>>([]);
  const [employees, setEmployees] = useState<Array<Schema["Employee"]["type"]>>([]);
  const [inventoryMovements, setInventoryMovements] = useState<Array<Schema["InventoryMovement"]["type"]>>([]);
  const [salesInvoices, setSalesInvoices] = useState<Array<Schema["SalesInvoice"]["type"]>>([]);
  const [serviceInvoices, setServiceInvoices] = useState<Array<Schema["ServiceInvoice"]["type"]>>([]);
  const [journalEntries, setJournalEntries] = useState<Array<Schema["JournalEntry"]["type"]>>([]);
  const [payrollRuns, setPayrollRuns] = useState<Array<Schema["PayrollRun"]["type"]>>([]);
  const [auditEvents, setAuditEvents] = useState<Array<Schema["AuditLogEvent"]["type"]>>([]);
  const [outboxEvents, setOutboxEvents] = useState<Array<Schema["MociOutboxEvent"]["type"]>>([]);
  const [deliveryAttempts, setDeliveryAttempts] = useState<Array<Schema["MociDeliveryAttempt"]["type"]>>([]);

  const [companyForm, setCompanyForm] = useState({ code: "QTR-HQ", nameEn: "Qatar ERP Company" });
  const [warehouseForm, setWarehouseForm] = useState({ code: "MAIN", nameEn: "Main Warehouse" });
  const [itemForm, setItemForm] = useState({ sku: "SKU-100", nameEn: "Demo Item", price: 15, cost: 8 });
  const [customerForm, setCustomerForm] = useState({ code: "C-100", nameEn: "Walk-In Customer" });
  const [serviceForm, setServiceForm] = useState({ code: "SVC-100", nameEn: "Standard Service", price: 50 });
  const [employeeForm, setEmployeeForm] = useState({ code: "E-100", nameEn: "Employee One", baseSalary: 6000 });

  const [inventoryForm, setInventoryForm] = useState({
    movementType: "RECEIPT",
    itemId: "",
    warehouseId: "",
    quantity: 1,
    unitCost: 1,
    reasonCode: "INITIAL_STOCK",
  });

  const [salesForm, setSalesForm] = useState({
    customerId: "",
    itemId: "",
    warehouseId: "",
    quantity: 1,
    unitPrice: 20,
  });

  const [serviceInvoiceForm, setServiceInvoiceForm] = useState({
    customerId: "",
    serviceId: "",
    quantity: 1,
    unitPrice: 35,
  });

  const [journalForm, setJournalForm] = useState({
    sourceType: "MANUAL",
    accountDebit: "1000-CASH",
    accountCredit: "4000-REVENUE",
    amount: 100,
    description: "Manual adjustment",
  });

  const [payrollForm, setPayrollForm] = useState({ salaryMonth: "2026-03" });

  useEffect(() => {
    const subs = [
      client.models.Company.observeQuery().subscribe({ next: (x) => setCompanies([...x.items]) }),
      client.models.Branch.observeQuery().subscribe({ next: (x) => setBranches([...x.items]) }),
      client.models.Warehouse.observeQuery().subscribe({ next: (x) => setWarehouses([...x.items]) }),
      client.models.Item.observeQuery().subscribe({ next: (x) => setItems([...x.items]) }),
      client.models.Customer.observeQuery().subscribe({ next: (x) => setCustomers([...x.items]) }),
      client.models.ServiceCatalog.observeQuery().subscribe({ next: (x) => setServices([...x.items]) }),
      client.models.Employee.observeQuery().subscribe({ next: (x) => setEmployees([...x.items]) }),
      client.models.InventoryMovement.observeQuery().subscribe({ next: (x) => setInventoryMovements([...x.items]) }),
      client.models.SalesInvoice.observeQuery().subscribe({ next: (x) => setSalesInvoices([...x.items]) }),
      client.models.ServiceInvoice.observeQuery().subscribe({ next: (x) => setServiceInvoices([...x.items]) }),
      client.models.JournalEntry.observeQuery().subscribe({ next: (x) => setJournalEntries([...x.items]) }),
      client.models.PayrollRun.observeQuery().subscribe({ next: (x) => setPayrollRuns([...x.items]) }),
      client.models.AuditLogEvent.observeQuery().subscribe({ next: (x) => setAuditEvents([...x.items]) }),
      client.models.MociOutboxEvent.observeQuery().subscribe({ next: (x) => setOutboxEvents([...x.items]) }),
      client.models.MociDeliveryAttempt.observeQuery().subscribe({ next: (x) => setDeliveryAttempts([...x.items]) }),
    ];
    return () => {
      subs.forEach((s) => s.unsubscribe());
    };
  }, []);

  const latestAuditHash = useMemo(() => {
    const sorted = [...auditEvents].sort((a, b) => (a.eventTimestamp || "").localeCompare(b.eventTimestamp || ""));
    return sorted[sorted.length - 1]?.currentHash ?? "GENESIS";
  }, [auditEvents]);

  const stockSnapshot = useMemo(() => {
    const map = new Map<string, number>();
    for (const move of inventoryMovements) {
      const key = `${move.itemId || ""}::${move.warehouseId || ""}`;
      map.set(key, (map.get(key) ?? 0) + (move.signedQuantity ?? 0));
    }
    return map;
  }, [inventoryMovements]);

  const integrationStats = useMemo(() => {
    const pending = outboxEvents.filter((x) => x.status === "PENDING").length;
    const failed = outboxEvents.filter((x) => x.status === "FAILED").length;
    const sent = outboxEvents.filter((x) => x.status === "SENT").length;
    const sortedAttempts = [...deliveryAttempts].sort((a, b) => (a.attemptedAt || "").localeCompare(b.attemptedAt || ""));
    const lastSuccess = sortedAttempts.reverse().find((x) => x.resultStatus === "SUCCESS")?.attemptedAt;
    return { pending, failed, sent, lastSuccess: lastSuccess ?? "Never" };
  }, [outboxEvents, deliveryAttempts]);

  async function createAuditEvent(args: {
    entityType: string;
    entityId: string;
    action: string;
    reason?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const currentHash = hashText(
      `${latestAuditHash}|${args.entityType}|${args.entityId}|${args.action}|${args.reason ?? ""}|${nowIso()}`
    );
    await client.models.AuditLogEvent.create({
      eventType: "COMPLIANCE_ACTION",
      actorId: CURRENT_USER,
      actorRole: "ERPAdmin",
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      eventTimestamp: nowIso(),
      reason: args.reason,
      payloadSnapshot: args.payload,
      previousHash: latestAuditHash,
      currentHash,
      isComplianceCritical: true,
    });
  }

  async function createOutboxAndAttempt(args: {
    sourceEntityType: string;
    sourceEntityId: string;
    eventCategory: "INVENTORY" | "SALES" | "SERVICE" | "PAYROLL";
    payload: Record<string, unknown>;
  }): Promise<void> {
    const outbox = await client.models.MociOutboxEvent.create({
      sourceEntityType: args.sourceEntityType,
      sourceEntityId: args.sourceEntityId,
      eventCategory: args.eventCategory,
      eventTimestamp: nowIso(),
      payloadVersion: "1.0.0",
      payload: args.payload,
      status: "SENT",
      lastAttemptAt: nowIso(),
      retryCount: 0,
    });

    const outboxId = outbox.data?.id;
    if (!outboxId) {
      return;
    }

    await client.models.MociDeliveryAttempt.create({
      outboxEventId: outboxId,
      adapterType: "REST_API",
      attemptNumber: 1,
      attemptedAt: nowIso(),
      resultStatus: "SUCCESS",
      responseCode: "200",
      responseMessage: "Simulated success",
      receiptReference: `MOCI-${Date.now()}`,
      latencyMs: 65,
    });
  }

  async function seedMasterData(): Promise<void> {
    const companyResult = await client.models.Company.create({
      code: companyForm.code,
      nameEn: companyForm.nameEn,
      isActive: true,
    });

    const companyId = companyResult.data?.id;
    if (!companyId) {
      setMessage("Failed to create company.");
      return;
    }

    const branchResult = await client.models.Branch.create({
      companyId,
      code: "BR-DOHA",
      nameEn: "Doha Branch",
      isActive: true,
    });

    const branchId = branchResult.data?.id;
    if (!branchId) {
      setMessage("Failed to create branch.");
      return;
    }

    const warehouseResult = await client.models.Warehouse.create({
      branchId,
      code: warehouseForm.code,
      nameEn: warehouseForm.nameEn,
      isActive: true,
    });

    await client.models.UnitOfMeasure.create({ code: "PCS", name: "Pieces", precision: 2, isActive: true });

    const itemResult = await client.models.Item.create({
      sku: itemForm.sku,
      nameEn: itemForm.nameEn,
      defaultUomCode: "PCS",
      standardCost: itemForm.cost,
      salesPrice: itemForm.price,
      isTracked: true,
      isActive: true,
    });

    await client.models.Customer.create({
      code: customerForm.code,
      nameEn: customerForm.nameEn,
      isActive: true,
    });

    await client.models.ServiceCatalog.create({
      code: serviceForm.code,
      nameEn: serviceForm.nameEn,
      defaultPrice: serviceForm.price,
      isActive: true,
    });

    const employeeResult = await client.models.Employee.create({
      employeeCode: employeeForm.code,
      fullNameEn: employeeForm.nameEn,
      status: "ACTIVE",
    });

    if (employeeResult.data?.id) {
      await client.models.EmployeeContract.create({
        employeeId: employeeResult.data.id,
        baseSalary: employeeForm.baseSalary,
        allowances: 0,
        deductions: 0,
        startsAt: nowIso(),
        isActive: true,
      });
    }

    await createAuditEvent({
      entityType: "MASTER_DATA",
      entityId: companyId,
      action: "SEED_MASTER_DATA",
      payload: {
        branchId,
        warehouseId: warehouseResult.data?.id,
        itemId: itemResult.data?.id,
      },
    });

    setMessage("Master data seeded.");
  }

  async function createInventoryMovement(): Promise<void> {
    const companyId = companies[0]?.id;
    const branchId = branches[0]?.id;
    if (!companyId || !branchId || !inventoryForm.itemId || !inventoryForm.warehouseId) {
      setMessage("Create master data and choose item/warehouse first.");
      return;
    }

    const eventId = `INV-${Date.now()}`;
    const movement = await client.models.InventoryMovement.create({
      eventId,
      movementType: inventoryForm.movementType as
        | "RECEIPT"
        | "ISSUE"
        | "TRANSFER_OUT"
        | "TRANSFER_IN"
        | "ADJUSTMENT"
        | "RETURN"
        | "SCRAP",
      companyId,
      branchId,
      warehouseId: inventoryForm.warehouseId,
      itemId: inventoryForm.itemId,
      quantity: Math.abs(inventoryForm.quantity),
      signedQuantity: signedQty(inventoryForm.movementType, inventoryForm.quantity),
      uomCode: "PCS",
      unitCost: inventoryForm.unitCost,
      reasonCode: inventoryForm.reasonCode,
      recordedAt: nowIso(),
      recordedBy: CURRENT_USER,
      sourceChannel: "ERP_UI",
      isReversal: false,
      approvalRequired: false,
      approvalStatus: "NONE",
    });

    const movementId = movement.data?.id;
    if (!movementId) {
      setMessage("Could not create movement.");
      return;
    }

    await createAuditEvent({
      entityType: "INVENTORY_MOVEMENT",
      entityId: movementId,
      action: "CREATE",
      reason: inventoryForm.reasonCode,
      payload: { eventId },
    });

    await createOutboxAndAttempt({
      sourceEntityType: "INVENTORY_MOVEMENT",
      sourceEntityId: movementId,
      eventCategory: "INVENTORY",
      payload: {
        eventId,
        movementType: inventoryForm.movementType,
        itemId: inventoryForm.itemId,
        warehouseId: inventoryForm.warehouseId,
        quantity: inventoryForm.quantity,
      },
    });

    setMessage("Inventory event posted and sent to MOCI outbox.");
  }

  async function createSalesInvoice(): Promise<void> {
    const companyId = companies[0]?.id;
    const branchId = branches[0]?.id;
    if (!companyId || !branchId || !salesForm.customerId || !salesForm.itemId || !salesForm.warehouseId) {
      setMessage("Create master data and complete sales fields first.");
      return;
    }

    const subtotal = salesForm.quantity * salesForm.unitPrice;
    const invoice = await client.models.SalesInvoice.create({
      invoiceNumber: `SI-${Date.now()}`,
      companyId,
      branchId,
      customerId: salesForm.customerId,
      status: "POSTED",
      currency: "QAR",
      subtotal,
      taxAmount: 0,
      totalAmount: subtotal,
      postedAt: nowIso(),
      postedBy: CURRENT_USER,
    });

    const salesId = invoice.data?.id;
    if (!salesId) {
      setMessage("Sales invoice creation failed.");
      return;
    }

    await client.models.SalesInvoiceLine.create({
      salesInvoiceId: salesId,
      itemId: salesForm.itemId,
      warehouseId: salesForm.warehouseId,
      quantity: salesForm.quantity,
      unitPrice: salesForm.unitPrice,
      lineTotal: subtotal,
      cogsUnitCost: items.find((x) => x.id === salesForm.itemId)?.standardCost ?? 0,
    });

    await client.models.InventoryMovement.create({
      eventId: `INV-SALE-${Date.now()}`,
      movementType: "ISSUE",
      companyId,
      branchId,
      warehouseId: salesForm.warehouseId,
      itemId: salesForm.itemId,
      quantity: Math.abs(salesForm.quantity),
      signedQuantity: -Math.abs(salesForm.quantity),
      uomCode: "PCS",
      unitCost: items.find((x) => x.id === salesForm.itemId)?.standardCost ?? 0,
      reasonCode: "SALE_POSTING",
      transactionRef: salesId,
      recordedAt: nowIso(),
      recordedBy: CURRENT_USER,
      sourceChannel: "ERP_UI",
      isReversal: false,
      approvalRequired: false,
      approvalStatus: "NONE",
    });

    const je = await client.models.JournalEntry.create({
      entryNumber: `JE-${Date.now()}`,
      sourceType: "SALES_INVOICE",
      sourceId: salesId,
      companyId,
      branchId,
      postingDate: nowIso(),
      periodKey: new Date().toISOString().slice(0, 7),
      status: "POSTED",
      totalDebit: subtotal,
      totalCredit: subtotal,
      postedBy: CURRENT_USER,
    });

    const jeId = je.data?.id;
    if (jeId) {
      await client.models.JournalLine.create({
        journalEntryId: jeId,
        accountCode: "1100-AR",
        description: "Accounts receivable",
        debit: subtotal,
        credit: 0,
        currency: "QAR",
        referenceId: salesId,
      });
      await client.models.JournalLine.create({
        journalEntryId: jeId,
        accountCode: "4100-SALES",
        description: "Sales revenue",
        debit: 0,
        credit: subtotal,
        currency: "QAR",
        referenceId: salesId,
      });
    }

    await createAuditEvent({
      entityType: "SALES_INVOICE",
      entityId: salesId,
      action: "POST",
      payload: { subtotal, quantity: salesForm.quantity },
    });

    await createOutboxAndAttempt({
      sourceEntityType: "SALES_INVOICE",
      sourceEntityId: salesId,
      eventCategory: "SALES",
      payload: {
        invoiceId: salesId,
        customerId: salesForm.customerId,
        totalAmount: subtotal,
      },
    });

    setMessage("Sales invoice posted with inventory, GL, audit, and outbox evidence.");
  }

  async function reverseSalesInvoice(invoiceId: string): Promise<void> {
    const invoice = salesInvoices.find((x) => x.id === invoiceId);
    if (!invoice) {
      return;
    }
    await client.models.SalesCorrection.create({
      originalInvoiceId: invoiceId,
      correctionType: "REVERSAL",
      reason: "Controlled correction",
      approvedBy: CURRENT_USER,
      approvedAt: nowIso(),
      createdBy: CURRENT_USER,
      createdAt: nowIso(),
    });

    await client.models.SalesInvoice.create({
      invoiceNumber: `RV-${Date.now()}`,
      companyId: invoice.companyId,
      branchId: invoice.branchId,
      customerId: invoice.customerId,
      status: "REVERSED",
      currency: invoice.currency,
      subtotal: -(invoice.subtotal ?? 0),
      taxAmount: -(invoice.taxAmount ?? 0),
      totalAmount: -(invoice.totalAmount ?? 0),
      postedAt: nowIso(),
      postedBy: CURRENT_USER,
      reversalInvoiceId: invoice.id,
    });

    await createAuditEvent({
      entityType: "SALES_INVOICE",
      entityId: invoiceId,
      action: "REVERSE",
      reason: "No destructive edits policy",
    });

    await createOutboxAndAttempt({
      sourceEntityType: "SALES_INVOICE",
      sourceEntityId: invoiceId,
      eventCategory: "SALES",
      payload: {
        originalInvoiceId: invoiceId,
        reversal: true,
      },
    });

    setMessage("Sales reversal posted as immutable correction.");
  }

  async function createServiceInvoice(): Promise<void> {
    const companyId = companies[0]?.id;
    const branchId = branches[0]?.id;
    if (!companyId || !branchId || !serviceInvoiceForm.customerId || !serviceInvoiceForm.serviceId) {
      setMessage("Complete service invoice fields first.");
      return;
    }

    const subtotal = serviceInvoiceForm.quantity * serviceInvoiceForm.unitPrice;
    const serviceInvoice = await client.models.ServiceInvoice.create({
      invoiceNumber: `SVI-${Date.now()}`,
      companyId,
      branchId,
      customerId: serviceInvoiceForm.customerId,
      serviceId: serviceInvoiceForm.serviceId,
      status: "POSTED",
      quantity: serviceInvoiceForm.quantity,
      unitPrice: serviceInvoiceForm.unitPrice,
      subtotal,
      taxAmount: 0,
      totalAmount: subtotal,
      postedAt: nowIso(),
      postedBy: CURRENT_USER,
    });

    const serviceInvoiceId = serviceInvoice.data?.id;
    if (!serviceInvoiceId) {
      setMessage("Service invoice failed.");
      return;
    }

    await createAuditEvent({
      entityType: "SERVICE_INVOICE",
      entityId: serviceInvoiceId,
      action: "POST",
      payload: { subtotal },
    });

    await createOutboxAndAttempt({
      sourceEntityType: "SERVICE_INVOICE",
      sourceEntityId: serviceInvoiceId,
      eventCategory: "SERVICE",
      payload: {
        serviceInvoiceId,
        totalAmount: subtotal,
      },
    });

    setMessage("Service invoice posted and integrated.");
  }

  async function createJournalEntry(): Promise<void> {
    const companyId = companies[0]?.id;
    const branchId = branches[0]?.id;
    if (!companyId || !branchId) {
      setMessage("Master data is missing for finance posting.");
      return;
    }

    const entry = await client.models.JournalEntry.create({
      entryNumber: `JE-MAN-${Date.now()}`,
      sourceType: journalForm.sourceType,
      sourceId: `MAN-${Date.now()}`,
      companyId,
      branchId,
      postingDate: nowIso(),
      periodKey: new Date().toISOString().slice(0, 7),
      status: "ADJUSTMENT",
      totalDebit: journalForm.amount,
      totalCredit: journalForm.amount,
      postedBy: CURRENT_USER,
    });

    const entryId = entry.data?.id;
    if (!entryId) {
      setMessage("Journal entry failed.");
      return;
    }

    await client.models.JournalLine.create({
      journalEntryId: entryId,
      accountCode: journalForm.accountDebit,
      description: journalForm.description,
      debit: journalForm.amount,
      credit: 0,
      currency: "QAR",
      referenceId: entryId,
    });

    await client.models.JournalLine.create({
      journalEntryId: entryId,
      accountCode: journalForm.accountCredit,
      description: journalForm.description,
      debit: 0,
      credit: journalForm.amount,
      currency: "QAR",
      referenceId: entryId,
    });

    await createAuditEvent({
      entityType: "JOURNAL_ENTRY",
      entityId: entryId,
      action: "POST",
      reason: "Manual adjustment with audit",
    });

    setMessage("Journal entry posted.");
  }

  async function createPayrollRunAndSif(): Promise<void> {
    if (!employees.length) {
      setMessage("Create employees first.");
      return;
    }

    const run = await client.models.PayrollRun.create({
      runCode: `PR-${Date.now()}`,
      salaryMonth: payrollForm.salaryMonth,
      status: "APPROVED",
      totalGross: 0,
      totalNet: 0,
      approvedBy: CURRENT_USER,
      approvedAt: nowIso(),
    });

    const runId = run.data?.id;
    if (!runId) {
      setMessage("Payroll run failed.");
      return;
    }

    let totalGross = 0;
    let totalNet = 0;
    const lines: string[] = [];

    for (const employee of employees) {
      const grossAmount = 6000;
      const deductionAmount = 0;
      const netAmount = grossAmount - deductionAmount;
      totalGross += grossAmount;
      totalNet += netAmount;

      await client.models.PayrollLine.create({
        payrollRunId: runId,
        employeeId: employee.id,
        grossAmount,
        deductionAmount,
        netAmount,
        paymentRef: `WPS-${employee.employeeCode}`,
      });

      lines.push(`${employee.employeeCode},${employee.fullNameEn},${netAmount.toFixed(2)},QAR`);
    }

    const sifContent = ["EmployeeCode,EmployeeName,NetSalary,Currency", ...lines].join("\n");

    const sifName = `WPS_SIF_${payrollForm.salaryMonth}_${Date.now()}.csv`;
    await client.models.WpsSifExport.create({
      payrollRunId: runId,
      salaryMonth: payrollForm.salaryMonth,
      fileName: sifName,
      status: "GENERATED",
      generatedBy: CURRENT_USER,
      generatedAt: nowIso(),
      checksum: hashText(sifContent),
      payload: { lines: lines.length, totalNet },
    });

    await createOutboxAndAttempt({
      sourceEntityType: "PAYROLL_RUN",
      sourceEntityId: runId,
      eventCategory: "PAYROLL",
      payload: {
        salaryMonth: payrollForm.salaryMonth,
        totalGross,
        totalNet,
      },
    });

    await createAuditEvent({
      entityType: "PAYROLL_RUN",
      entityId: runId,
      action: "WPS_SIF_EXPORT",
      payload: { salaryMonth: payrollForm.salaryMonth, totalNet },
    });

    downloadText(sifName, sifContent);
    setMessage("Payroll approved and WPS SIF file exported.");
  }

  async function createInspectionExport(): Promise<void> {
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = nowIso();
    const exportCode = `INSP-${Date.now()}`;
    const payload = {
      inventoryCount: inventoryMovements.length,
      salesCount: salesInvoices.length,
      serviceCount: serviceInvoices.length,
      auditCount: auditEvents.length,
      outboxCount: outboxEvents.length,
      failedOutbox: integrationStats.failed,
      generatedAt: toDate,
    };

    await client.models.InspectionExportRecord.create({
      exportCode,
      generatedBy: CURRENT_USER,
      generatedAt: toDate,
      fromDate,
      toDate,
      includedInventory: true,
      includedSales: true,
      includedServices: true,
      includedAudit: true,
      includedIntegration: true,
      packageSummary: payload,
    });

    await createAuditEvent({
      entityType: "INSPECTION_EXPORT",
      entityId: exportCode,
      action: "GENERATE_PACKAGE",
      payload,
    });

    downloadText(`${exportCode}.json`, JSON.stringify(payload, null, 2));
    setMessage("Inspection export package generated.");
  }

  const tabs: Array<{ key: TabKey; labelEn: string; labelAr: string }> = [
    { key: "dashboard", labelEn: "Dashboard", labelAr: "لوحة المتابعة" },
    { key: "master", labelEn: "Master Data", labelAr: "البيانات الرئيسية" },
    { key: "inventory", labelEn: "Inventory", labelAr: "المخزون" },
    { key: "sales", labelEn: "Sales", labelAr: "المبيعات" },
    { key: "services", labelEn: "Services", labelAr: "الخدمات" },
    { key: "finance", labelEn: "Finance", labelAr: "المالية" },
    { key: "payroll", labelEn: "Payroll", labelAr: "الرواتب" },
    { key: "integration", labelEn: "MOCI Integration", labelAr: "تكامل الوزارة" },
    { key: "inspection", labelEn: "Inspection", labelAr: "وضع التفتيش" },
  ];

  return (
    <main className="erp-shell" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="hero">
        <div>
          <p className="hero-kicker">Qatar Compliance-First ERP</p>
          <h1>
            {language === "en"
              ? "Real-time inventory, sales, payroll, and MOCI evidence"
              : "نظام متكامل للمخزون والمبيعات والرواتب مع أدلة الامتثال"}
          </h1>
          <p>
            {language === "en"
              ? "All regulated changes are immutable events with audit and outbox traceability."
              : "كل العمليات النظامية تحفظ كسجل غير قابل للتلاعب مع تتبع كامل للتدقيق والتكامل."}
          </p>
        </div>
        <button className="secondary" onClick={() => setLanguage(language === "en" ? "ar" : "en")}>
          {language === "en" ? "Switch to Arabic" : "التحويل إلى الإنجليزية"}
        </button>
      </header>

      <nav className="tab-row">
        {tabs.map((entry) => (
          <button key={entry.key} className={tab === entry.key ? "tab active" : "tab"} onClick={() => setTab(entry.key)}>
            {language === "en" ? entry.labelEn : entry.labelAr}
          </button>
        ))}
      </nav>

      {message && <section className="message">{message}</section>}

      {tab === "dashboard" && (
        <section className="panel-grid">
          <article className="panel stat">
            <h3>Inventory Events</h3>
            <strong>{inventoryMovements.length}</strong>
          </article>
          <article className="panel stat">
            <h3>Sales + Services</h3>
            <strong>{salesInvoices.length + serviceInvoices.length}</strong>
          </article>
          <article className="panel stat">
            <h3>Audit Events</h3>
            <strong>{auditEvents.length}</strong>
          </article>
          <article className="panel stat">
            <h3>MOCI Pending Queue</h3>
            <strong>{integrationStats.pending}</strong>
          </article>
          <article className="panel wide">
            <h3>Integration Health</h3>
            <p>Sent: {integrationStats.sent}</p>
            <p>Failed: {integrationStats.failed}</p>
            <p>Last Success: {integrationStats.lastSuccess}</p>
          </article>
        </section>
      )}

      {tab === "master" && (
        <section className="panel-grid">
          <article className="panel wide">
            <h3>Master Data Bootstrap</h3>
            <div className="form-grid">
              <label>
                Company Code
                <input value={companyForm.code} onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value })} />
              </label>
              <label>
                Company Name
                <input value={companyForm.nameEn} onChange={(e) => setCompanyForm({ ...companyForm, nameEn: e.target.value })} />
              </label>
              <label>
                Warehouse Code
                <input value={warehouseForm.code} onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })} />
              </label>
              <label>
                Item SKU
                <input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} />
              </label>
              <label>
                Customer Code
                <input value={customerForm.code} onChange={(e) => setCustomerForm({ ...customerForm, code: e.target.value })} />
              </label>
              <label>
                Service Code
                <input value={serviceForm.code} onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })} />
              </label>
              <label>
                Employee Code
                <input value={employeeForm.code} onChange={(e) => setEmployeeForm({ ...employeeForm, code: e.target.value })} />
              </label>
            </div>
            <button onClick={seedMasterData}>Seed Base Data</button>
          </article>
        </section>
      )}

      {tab === "inventory" && (
        <section className="panel-grid">
          <article className="panel wide">
            <h3>Post Inventory Movement (Append-Only)</h3>
            <div className="form-grid">
              <label>
                Movement Type
                <select value={inventoryForm.movementType} onChange={(e) => setInventoryForm({ ...inventoryForm, movementType: e.target.value })}>
                  <option>RECEIPT</option>
                  <option>ISSUE</option>
                  <option>TRANSFER_OUT</option>
                  <option>TRANSFER_IN</option>
                  <option>ADJUSTMENT</option>
                  <option>RETURN</option>
                  <option>SCRAP</option>
                </select>
              </label>
              <label>
                Item
                <select value={inventoryForm.itemId} onChange={(e) => setInventoryForm({ ...inventoryForm, itemId: e.target.value })}>
                  <option value="">Select item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku} - {item.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Warehouse
                <select value={inventoryForm.warehouseId} onChange={(e) => setInventoryForm({ ...inventoryForm, warehouseId: e.target.value })}>
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} - {warehouse.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input type="number" value={inventoryForm.quantity} onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: Number(e.target.value) })} />
              </label>
              <label>
                Unit Cost
                <input type="number" value={inventoryForm.unitCost} onChange={(e) => setInventoryForm({ ...inventoryForm, unitCost: Number(e.target.value) })} />
              </label>
            </div>
            <button onClick={createInventoryMovement}>Post Movement</button>
          </article>
          <article className="panel wide">
            <h3>Stock-On-Hand Snapshot</h3>
            <ul className="list">
              {[...stockSnapshot.entries()].map(([key, qty]) => (
                <li key={key}>
                  <span>{key}</span>
                  <strong>{qty.toFixed(2)}</strong>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {tab === "sales" && (
        <section className="panel-grid">
          <article className="panel wide">
            <h3>Sales Invoice (Immediate Posting)</h3>
            <div className="form-grid">
              <label>
                Customer
                <select value={salesForm.customerId} onChange={(e) => setSalesForm({ ...salesForm, customerId: e.target.value })}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.code} - {customer.nameEn}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Item
                <select value={salesForm.itemId} onChange={(e) => setSalesForm({ ...salesForm, itemId: e.target.value })}>
                  <option value="">Select item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.sku}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Warehouse
                <select value={salesForm.warehouseId} onChange={(e) => setSalesForm({ ...salesForm, warehouseId: e.target.value })}>
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input type="number" value={salesForm.quantity} onChange={(e) => setSalesForm({ ...salesForm, quantity: Number(e.target.value) })} />
              </label>
              <label>
                Unit Price
                <input type="number" value={salesForm.unitPrice} onChange={(e) => setSalesForm({ ...salesForm, unitPrice: Number(e.target.value) })} />
              </label>
            </div>
            <button onClick={createSalesInvoice}>Post Sales Invoice</button>
          </article>
          <article className="panel wide">
            <h3>Posted Sales (Reversal Only)</h3>
            <ul className="list">
              {salesInvoices.map((invoice) => (
                <li key={invoice.id}>
                  <span>
                    {invoice.invoiceNumber} | {invoice.status} | {invoice.totalAmount}
                  </span>
                  <button className="small" onClick={() => reverseSalesInvoice(invoice.id)}>
                    Reverse
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {tab === "services" && (
        <section className="panel-grid">
          <article className="panel wide">
            <h3>Service Invoice</h3>
            <div className="form-grid">
              <label>
                Customer
                <select value={serviceInvoiceForm.customerId} onChange={(e) => setServiceInvoiceForm({ ...serviceInvoiceForm, customerId: e.target.value })}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Service
                <select value={serviceInvoiceForm.serviceId} onChange={(e) => setServiceInvoiceForm({ ...serviceInvoiceForm, serviceId: e.target.value })}>
                  <option value="">Select service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity
                <input type="number" value={serviceInvoiceForm.quantity} onChange={(e) => setServiceInvoiceForm({ ...serviceInvoiceForm, quantity: Number(e.target.value) })} />
              </label>
              <label>
                Unit Price
                <input type="number" value={serviceInvoiceForm.unitPrice} onChange={(e) => setServiceInvoiceForm({ ...serviceInvoiceForm, unitPrice: Number(e.target.value) })} />
              </label>
            </div>
            <button onClick={createServiceInvoice}>Post Service Invoice</button>
          </article>
        </section>
      )}

      {tab === "finance" && (
        <section className="panel-grid">
          <article className="panel wide">
            <h3>Journal Posting Engine (Manual Adjustment)</h3>
            <div className="form-grid">
              <label>
                Debit Account
                <input value={journalForm.accountDebit} onChange={(e) => setJournalForm({ ...journalForm, accountDebit: e.target.value })} />
              </label>
              <label>
                Credit Account
                <input value={journalForm.accountCredit} onChange={(e) => setJournalForm({ ...journalForm, accountCredit: e.target.value })} />
              </label>
              <label>
                Amount
                <input type="number" value={journalForm.amount} onChange={(e) => setJournalForm({ ...journalForm, amount: Number(e.target.value) })} />
              </label>
            </div>
            <button onClick={createJournalEntry}>Post Journal Entry</button>
          </article>
          <article className="panel wide">
            <h3>Recent Journal Entries</h3>
            <ul className="list">
              {journalEntries.map((entry) => (
                <li key={entry.id}>
                  <span>
                    {entry.entryNumber} | {entry.status} | DR {entry.totalDebit} / CR {entry.totalCredit}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {tab === "payroll" && (
        <section className="panel-grid">
          <article className="panel wide">
            <h3>Payroll + WPS Export</h3>
            <div className="form-grid">
              <label>
                Salary Month (YYYY-MM)
                <input value={payrollForm.salaryMonth} onChange={(e) => setPayrollForm({ salaryMonth: e.target.value })} />
              </label>
            </div>
            <button onClick={createPayrollRunAndSif}>Approve Payroll and Export SIF</button>
          </article>
          <article className="panel wide">
            <h3>Payroll Runs</h3>
            <ul className="list">
              {payrollRuns.map((run) => (
                <li key={run.id}>
                  <span>
                    {run.runCode} | {run.salaryMonth} | {run.status}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {tab === "integration" && (
        <section className="panel-grid">
          <article className="panel wide">
            <h3>MOCI Integration Dashboard</h3>
            <p>Pending Queue: {integrationStats.pending}</p>
            <p>Failed Messages: {integrationStats.failed}</p>
            <p>Delivered Messages: {integrationStats.sent}</p>
            <p>Last Success: {integrationStats.lastSuccess}</p>
          </article>
          <article className="panel wide">
            <h3>Latest Outbox Events</h3>
            <ul className="list">
              {outboxEvents.slice(0, 20).map((event) => (
                <li key={event.id}>
                  <span>
                    {event.sourceEntityType} | {event.eventCategory} | {event.status}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {tab === "inspection" && (
        <section className="panel-grid">
          <article className="panel wide">
            <h3>Inspection Mode Export Pack</h3>
            <p>Generates a package summary with ledgers, audit footprint, and integration evidence for regulator inspection workflows.</p>
            <button onClick={createInspectionExport}>Generate Inspection Export</button>
          </article>
          <article className="panel wide">
            <h3>Recent Audit Trail</h3>
            <ul className="list">
              {auditEvents.slice(0, 20).map((event) => (
                <li key={event.id}>
                  <span>
                    {event.action} | {event.entityType} | {event.eventTimestamp}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      <div className="footer-note">Immutable-ledger policy active: corrections are reversals with audit and approval evidence.</div>
    </main>
  );
}

export default withAuthenticator(App);
