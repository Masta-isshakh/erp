import { useEffect, useMemo, useRef, useState } from "react";
import { withAuthenticator, type WithAuthenticatorProps } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import "@aws-amplify/ui-react/styles.css";
import "./App.css";

const client = generateClient<Schema>();

type Page = "inventory" | "supplier" | "supplierDetails" | "admin";
type PopupType = "success" | "error";
type InventoryFieldType = "text" | "number" | "date" | "boolean" | "textarea";
type InventoryFieldDraft = {
  tempId: string;
  definitionId?: string;
  label: string;
  fieldType: InventoryFieldType;
  value: string;
};
type InventoryCsvMapping = "ignore" | "name" | "trackingMode" | "quantity" | "barcode" | "notes" | "custom";
type InventoryCsvPreviewState = {
  fileName: string;
  headers: string[];
  rows: string[][];
};
type InventoryCsvRowValidation = {
  rowNumber: number;
  errors: string[];
};

type PolicyKey =
  | "inventory.view"
  | "inventory.create"
  | "inventory.update"
  | "inventory.delete"
  | "supplier.view"
  | "supplier.create"
  | "supplier.update"
  | "supplier.delete"
  | "supplier.contact"
  | "supplier.email.send"
  | "department.manage"
  | "role.manage"
  | "policy.manage"
  | "role.policy.assign"
  | "user.manage"
  | "user.role.assign"
  | "user.department.assign";

const DEFAULT_POLICIES: Array<{ key: PolicyKey; module: string; description: string }> = [
  { key: "inventory.view", module: "inventory", description: "View inventory" },
  { key: "inventory.create", module: "inventory", description: "Create inventory" },
  { key: "inventory.update", module: "inventory", description: "Update inventory" },
  { key: "inventory.delete", module: "inventory", description: "Delete inventory" },
  { key: "supplier.view", module: "supplier", description: "View suppliers" },
  { key: "supplier.create", module: "supplier", description: "Create suppliers" },
  { key: "supplier.update", module: "supplier", description: "Update suppliers" },
  { key: "supplier.delete", module: "supplier", description: "Delete suppliers" },
  { key: "supplier.contact", module: "supplier", description: "Contact supplier" },
  { key: "supplier.email.send", module: "supplier", description: "Send supplier email" },
  { key: "department.manage", module: "admin", description: "Manage departments" },
  { key: "role.manage", module: "admin", description: "Manage roles" },
  { key: "policy.manage", module: "admin", description: "Manage policies" },
  { key: "role.policy.assign", module: "admin", description: "Assign policies to roles" },
  { key: "user.manage", module: "admin", description: "Manage users" },
  { key: "user.role.assign", module: "admin", description: "Assign roles to users" },
  { key: "user.department.assign", module: "admin", description: "Assign users to departments" },
];

function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function makeDraftId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function App({ signOut, user }: WithAuthenticatorProps) {
  const models = client.models as Record<string, { observeQuery?: () => { subscribe: (args: { next: ({ items }: { items: unknown[] }) => void }) => { unsubscribe: () => void } }; create?: (input: unknown) => Promise<unknown>; update?: (input: unknown) => Promise<unknown>; delete?: (input: { id: string }) => Promise<unknown> }>;
  const isModelReady = (modelName: string): boolean => Boolean(models[modelName]);
  const ensureModel = (modelName: string): boolean => {
    if (!isModelReady(modelName)) {
      setStatusMessage("Amplify backend is out of sync with the app schema. Run `npx ampx sandbox` (or deploy backend) and refresh.");
      return false;
    }
    return true;
  };

  const [page, setPage] = useState<Page>("supplier");
  const [statusMessage, setStatusMessage] = useState("");
  const [popup, setPopup] = useState<{ open: boolean; type: PopupType; title: string; message: string }>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const [inventoryCategories, setInventoryCategories] = useState<Array<Schema["InventoryCategory"]["type"]>>([]);
  const [inventoryFieldDefinitions, setInventoryFieldDefinitions] = useState<Array<Schema["InventoryFieldDefinition"]["type"]>>([]);
  const [inventoryItems, setInventoryItems] = useState<Array<Schema["InventoryItem"]["type"]>>([]);
  const [inventoryItemFieldValues, setInventoryItemFieldValues] = useState<Array<Schema["InventoryItemFieldValue"]["type"]>>([]);
  const [supplierRows, setSupplierRows] = useState<Array<Schema["Supplier"]["type"]>>([]);
  const [appUsers, setAppUsers] = useState<Array<Schema["AppUser"]["type"]>>([]);
  const [departments, setDepartments] = useState<Array<Schema["Department"]["type"]>>([]);
  const [roles, setRoles] = useState<Array<Schema["Role"]["type"]>>([]);
  const [policies, setPolicies] = useState<Array<Schema["Policy"]["type"]>>([]);
  const [rolePolicies, setRolePolicies] = useState<Array<Schema["RolePolicy"]["type"]>>([]);
  const [userRoles, setUserRoles] = useState<Array<Schema["UserRole"]["type"]>>([]);

  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedInventoryCategoryId, setSelectedInventoryCategoryId] = useState("");
  const [inventoryCategorySearch, setInventoryCategorySearch] = useState("");
  const [expandedInventoryCategoryIds, setExpandedInventoryCategoryIds] = useState<string[]>([]);
  const [selectedInventoryItemIds, setSelectedInventoryItemIds] = useState<string[]>([]);

  const [inventoryCategoryForm, setInventoryCategoryForm] = useState({
    name: "",
    description: "",
    parentCategoryId: "",
  });
  const [editingInventoryCategoryId, setEditingInventoryCategoryId] = useState("");
  const [showInventoryCategoryModal, setShowInventoryCategoryModal] = useState(false);

  const [inventoryItemForm, setInventoryItemForm] = useState({
    name: "",
    trackingMode: "quantity" as "quantity" | "barcode",
    quantity: "",
    barcode: "",
    notes: "",
  });
  const [editingInventoryItemId, setEditingInventoryItemId] = useState("");
  const [showInventoryItemModal, setShowInventoryItemModal] = useState(false);
  const [inventoryFieldDrafts, setInventoryFieldDrafts] = useState<InventoryFieldDraft[]>([]);
  const [draggedInventoryFieldId, setDraggedInventoryFieldId] = useState("");
  const [isBarcodeCaptureActive, setIsBarcodeCaptureActive] = useState(false);
  const [barcodeScanBuffer, setBarcodeScanBuffer] = useState("");
  const csvImportInputRef = useRef<HTMLInputElement | null>(null);
  const [showInventoryCsvImportModal, setShowInventoryCsvImportModal] = useState(false);
  const [inventoryCsvPreview, setInventoryCsvPreview] = useState<InventoryCsvPreviewState | null>(null);
  const [inventoryCsvMapping, setInventoryCsvMapping] = useState<Record<string, InventoryCsvMapping>>({});

  const [supplierForm, setSupplierForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [editingSupplierId, setEditingSupplierId] = useState("");
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierPage, setSupplierPage] = useState(1);
  const SUPPLIERS_PER_PAGE = 9;

  const [emailForm, setEmailForm] = useState({
    subject: "",
    htmlContent: "<h2>Hello</h2><p>Message to supplier.</p>",
  });

  const [departmentForm, setDepartmentForm] = useState({ name: "", description: "" });
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [policyForm, setPolicyForm] = useState({ key: "", module: "admin", description: "" });
  const [adminUserForm, setAdminUserForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    isAdmin: false,
    departmentId: "",
  });
  const [roleAssignment, setRoleAssignment] = useState({ userId: "", roleId: "" });
  const [policyAssignment, setPolicyAssignment] = useState({ roleId: "", policyId: "" });

  const openSuccessPopup = (message: string): void => {
    setPopup({ open: true, type: "success", title: "Success", message });
    setStatusMessage(message);
  };

  const openErrorPopup = (message: string): void => {
    setPopup({ open: true, type: "error", title: "Failed", message });
    setStatusMessage(message);
  };

  const closePopup = (): void => {
    setPopup((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (!popup.open) {
      return;
    }

    const timer = window.setTimeout(() => {
      closePopup();
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [popup.open]);

  // Global Esc key: close popup first, then modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") {
        return;
      }
      if (popup.open) {
        closePopup();
      } else if (showInventoryCsvImportModal) {
        closeInventoryCsvImportModal();
      } else if (showInventoryItemModal) {
        setShowInventoryItemModal(false);
      } else if (showInventoryCategoryModal) {
        setShowInventoryCategoryModal(false);
      } else if (showSupplierModal) {
        setShowSupplierModal(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [popup.open, showInventoryCategoryModal, showInventoryCsvImportModal, showInventoryItemModal, showSupplierModal]);

  useEffect(() => {
    const subscriptions: Array<{ unsubscribe: () => void }> = [];

    const subscribeModel = <T,>(modelName: string, setter: (rows: T[]) => void): void => {
      const model = models[modelName];
      if (!model?.observeQuery) {
        return;
      }

      const sub = model.observeQuery().subscribe({ next: ({ items }) => setter([...(items as T[])]) });
      subscriptions.push(sub);
    };

    subscribeModel<Schema["InventoryCategory"]["type"]>("InventoryCategory", setInventoryCategories);
    subscribeModel<Schema["InventoryFieldDefinition"]["type"]>("InventoryFieldDefinition", setInventoryFieldDefinitions);
    subscribeModel<Schema["InventoryItem"]["type"]>("InventoryItem", setInventoryItems);
    subscribeModel<Schema["InventoryItemFieldValue"]["type"]>("InventoryItemFieldValue", setInventoryItemFieldValues);
    subscribeModel<Schema["Supplier"]["type"]>("Supplier", setSupplierRows);
    subscribeModel<Schema["AppUser"]["type"]>("AppUser", setAppUsers);
    subscribeModel<Schema["Department"]["type"]>("Department", setDepartments);
    subscribeModel<Schema["Role"]["type"]>("Role", setRoles);
    subscribeModel<Schema["Policy"]["type"]>("Policy", setPolicies);
    subscribeModel<Schema["RolePolicy"]["type"]>("RolePolicy", setRolePolicies);
    subscribeModel<Schema["UserRole"]["type"]>("UserRole", setUserRoles);

    if (!isModelReady("InventoryCategory") || !isModelReady("InventoryItem") || !isModelReady("Supplier")) {
      setStatusMessage("Amplify backend is out of sync with the app schema. Run `npx ampx sandbox` (or deploy backend) and refresh.");
    }

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [models]);

  useEffect(() => {
    const boot = async (): Promise<void> => {
      if (!user?.signInDetails?.loginId && !user?.username) {
        return;
      }

      if (!ensureModel("Policy") || !ensureModel("AppUser")) {
        return;
      }

      const policyModel = models.Policy;
      const appUserModel = models.AppUser;
      if (!policyModel?.create || !appUserModel?.create || !appUserModel?.update) {
        return;
      }

      for (const p of DEFAULT_POLICIES) {
        const exists = policies.find((x) => x.key === p.key);
        if (!exists) {
          await policyModel.create({ key: p.key, module: p.module, description: p.description, isActive: true });
        }
      }

      const loginId = user.signInDetails?.loginId || user.username || "";
      const existingUser = appUsers.find((u) => u.email.toLowerCase() === loginId.toLowerCase());
      if (!existingUser) {
        await appUserModel.create({
          email: loginId,
          firstName: "Admin",
          lastName: "User",
          cognitoSub: user.userId,
          isAdmin: appUsers.length === 0,
          isActive: true,
        });
      } else if (!existingUser.cognitoSub && user.userId) {
        await appUserModel.update({ id: existingUser.id, cognitoSub: user.userId });
      }
    };

    void boot();
  }, [appUsers, models, policies, user]);

  const currentAppUser = useMemo(() => {
    const loginId = (user?.signInDetails?.loginId || user?.username || "").toLowerCase();
    return appUsers.find((u) => u.email.toLowerCase() === loginId || (user?.userId && u.cognitoSub === user.userId));
  }, [appUsers, user]);

  const effectivePolicyKeys = useMemo(() => {
    if (!currentAppUser) {
      return new Set<string>();
    }

    if (currentAppUser.isAdmin) {
      return new Set(DEFAULT_POLICIES.map((p) => p.key));
    }

    const roleIds = userRoles.filter((ur) => ur.userId === currentAppUser.id && ur.isActive !== false).map((ur) => ur.roleId);
    const policyIds = rolePolicies
      .filter((rp) => roleIds.includes(rp.roleId) && rp.isActive !== false)
      .map((rp) => rp.policyId);

    const policyKeys = policies.filter((p) => policyIds.includes(p.id) && p.isActive !== false).map((p) => p.key);
    return new Set(policyKeys);
  }, [currentAppUser, policies, rolePolicies, userRoles]);

  const can = (policy: PolicyKey): boolean => {
    if (currentAppUser?.isAdmin) {
      return true;
    }

    return effectivePolicyKeys.has(policy);
  };

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) {
      return supplierRows;
    }

    return supplierRows.filter((s) => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      return fullName.includes(q) || (s.email || "").toLowerCase().includes(q) || (s.phone || "").toLowerCase().includes(q);
    });
  }, [supplierRows, supplierSearch]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setSupplierPage(1);
  }, [supplierSearch]);

  const supplierTotalPages = Math.max(1, Math.ceil(filteredSuppliers.length / SUPPLIERS_PER_PAGE));
  const pagedSuppliers = useMemo(() => {
    const start = (supplierPage - 1) * SUPPLIERS_PER_PAGE;
    return filteredSuppliers.slice(start, start + SUPPLIERS_PER_PAGE);
  }, [filteredSuppliers, supplierPage, SUPPLIERS_PER_PAGE]);

  const selectedSupplier = useMemo(() => supplierRows.find((s) => s.id === selectedSupplierId), [supplierRows, selectedSupplierId]);
  const topLevelInventoryCategories = useMemo(
    () => inventoryCategories.filter((category) => !category.parentCategoryId).sort((left, right) => left.name.localeCompare(right.name)),
    [inventoryCategories]
  );
  const inventoryCategoryChildrenMap = useMemo(() => {
    return inventoryCategories.reduce<Record<string, Array<Schema["InventoryCategory"]["type"]>>>((accumulator, category) => {
      const parentKey = category.parentCategoryId || "root";
      const next = accumulator[parentKey] || [];
      next.push(category);
      accumulator[parentKey] = next.sort((left, right) => left.name.localeCompare(right.name));
      return accumulator;
    }, {});
  }, [inventoryCategories]);
  const inventoryItemsByCategoryMap = useMemo(() => {
    return inventoryItems.reduce<Record<string, Array<Schema["InventoryItem"]["type"]>>>((accumulator, item) => {
      const next = accumulator[item.categoryId] || [];
      next.push(item);
      accumulator[item.categoryId] = next.sort((left, right) => left.name.localeCompare(right.name));
      return accumulator;
    }, {});
  }, [inventoryItems]);
  const selectedInventoryCategory = useMemo(
    () => inventoryCategories.find((category) => category.id === selectedInventoryCategoryId),
    [inventoryCategories, selectedInventoryCategoryId]
  );
  const selectedCategoryHasChildren = useMemo(
    () => inventoryCategories.some((category) => category.parentCategoryId === selectedInventoryCategoryId),
    [inventoryCategories, selectedInventoryCategoryId]
  );
  const selectedCategoryFieldDefinitions = useMemo(
    () => inventoryFieldDefinitions
      .filter((fieldDefinition) => fieldDefinition.categoryId === selectedInventoryCategoryId)
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0)),
    [inventoryFieldDefinitions, selectedInventoryCategoryId]
  );
  const inventoryCsvRowValidations = useMemo(() => {
    if (!inventoryCsvPreview) {
      return [] as InventoryCsvRowValidation[];
    }

    const headerMap = inventoryCsvPreview.headers.reduce<Record<string, number>>((accumulator, header, index) => {
      accumulator[header] = index;
      return accumulator;
    }, {});
    const nameHeader = inventoryCsvPreview.headers.find((header) => inventoryCsvMapping[header] === "name");
    const trackingHeader = inventoryCsvPreview.headers.find((header) => inventoryCsvMapping[header] === "trackingMode");
    const quantityHeader = inventoryCsvPreview.headers.find((header) => inventoryCsvMapping[header] === "quantity");
    const barcodeHeader = inventoryCsvPreview.headers.find((header) => inventoryCsvMapping[header] === "barcode");

    return inventoryCsvPreview.rows.map((row, rowIndex) => {
      const errors: string[] = [];
      const name = nameHeader ? row[headerMap[nameHeader]]?.trim() || "" : "";
      const inferredTrackingMode = ((trackingHeader ? row[headerMap[trackingHeader]] : "") || (barcodeHeader ? "barcode" : "quantity")).trim().toLowerCase();

      if (!nameHeader) {
        errors.push("No column is mapped to Name.");
      }
      if (!name) {
        errors.push("Name is required.");
      }
      if (!["quantity", "barcode"].includes(inferredTrackingMode)) {
        errors.push("Tracking mode must be quantity or barcode.");
      }
      if (inferredTrackingMode === "quantity" && quantityHeader && (row[headerMap[quantityHeader]]?.trim() || "") === "") {
        errors.push("Quantity is required for quantity-tracked items.");
      }
      if (inferredTrackingMode === "barcode" && barcodeHeader && (row[headerMap[barcodeHeader]]?.trim() || "") === "") {
        errors.push("Barcode is required for barcode-tracked items.");
      }

      return { rowNumber: rowIndex + 2, errors };
    });
  }, [inventoryCsvMapping, inventoryCsvPreview]);
  const inventoryBreadcrumbs = useMemo(() => {
    if (!selectedInventoryCategoryId) {
      return [] as Array<Schema["InventoryCategory"]["type"]>;
    }

    const categoriesById = new Map(inventoryCategories.map((category) => [category.id, category]));
    const trail: Array<Schema["InventoryCategory"]["type"]> = [];
    let cursor = categoriesById.get(selectedInventoryCategoryId);

    while (cursor) {
      trail.unshift(cursor);
      cursor = cursor.parentCategoryId ? categoriesById.get(cursor.parentCategoryId) : undefined;
    }

    return trail;
  }, [inventoryCategories, selectedInventoryCategoryId]);
  const matchingInventoryCategoryIds = useMemo(() => {
    const query = inventoryCategorySearch.trim().toLowerCase();
    if (!query) {
      return new Set(inventoryCategories.map((category) => category.id));
    }

    const categoriesById = new Map(inventoryCategories.map((category) => [category.id, category]));
    const matches = new Set<string>();

    for (const category of inventoryCategories) {
      const haystack = `${category.name} ${category.description || ""}`.toLowerCase();
      if (!haystack.includes(query)) {
        continue;
      }

      let cursor: Schema["InventoryCategory"]["type"] | undefined = category;
      while (cursor) {
        matches.add(cursor.id);
        cursor = cursor.parentCategoryId ? categoriesById.get(cursor.parentCategoryId) : undefined;
      }
    }

    return matches;
  }, [inventoryCategories, inventoryCategorySearch]);
  const canCreateItemsInSelectedCategory = useMemo(() => {
    if (!selectedInventoryCategory) {
      return false;
    }

    // When a parent category has subcategories, force items to be created inside subcategories.
    if (!selectedInventoryCategory.parentCategoryId && selectedCategoryHasChildren) {
      return false;
    }

    return true;
  }, [selectedCategoryHasChildren, selectedInventoryCategory]);

  useEffect(() => {
    if (!selectedInventoryCategoryId && topLevelInventoryCategories.length > 0) {
      setSelectedInventoryCategoryId(topLevelInventoryCategories[0].id);
      return;
    }

    if (selectedInventoryCategoryId && !inventoryCategories.some((category) => category.id === selectedInventoryCategoryId)) {
      setSelectedInventoryCategoryId(topLevelInventoryCategories[0]?.id || "");
    }
  }, [inventoryCategories, selectedInventoryCategoryId, topLevelInventoryCategories]);

  useEffect(() => {
    setSelectedInventoryItemIds([]);
  }, [selectedInventoryCategoryId]);

  useEffect(() => {
    if (!selectedInventoryCategoryId) {
      return;
    }

    setExpandedInventoryCategoryIds((currentIds) => {
      const nextIds = new Set(currentIds);
      for (const category of inventoryBreadcrumbs) {
        nextIds.add(category.id);
      }
      return [...nextIds];
    });
  }, [inventoryBreadcrumbs, selectedInventoryCategoryId]);

  useEffect(() => {
    if (!inventoryCategorySearch.trim()) {
      return;
    }

    setExpandedInventoryCategoryIds([...matchingInventoryCategoryIds]);
  }, [inventoryCategorySearch, matchingInventoryCategoryIds]);

  useEffect(() => {
    if (!showInventoryItemModal || inventoryItemForm.trackingMode !== "barcode" || !isBarcodeCaptureActive) {
      return;
    }

    const handleBarcodeCapture = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsBarcodeCaptureActive(false);
        return;
      }

      if (event.key === "Enter") {
        if (barcodeScanBuffer.trim()) {
          setInventoryItemForm((currentForm) => ({ ...currentForm, barcode: barcodeScanBuffer.trim() }));
          setIsBarcodeCaptureActive(false);
          setStatusMessage(`Barcode captured: ${barcodeScanBuffer.trim()}`);
        }
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setBarcodeScanBuffer((currentValue) => currentValue.slice(0, -1));
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        setBarcodeScanBuffer((currentValue) => `${currentValue}${event.key}`);
      }
    };

    window.addEventListener("keydown", handleBarcodeCapture);
    return () => window.removeEventListener("keydown", handleBarcodeCapture);
  }, [barcodeScanBuffer, inventoryItemForm.trackingMode, isBarcodeCaptureActive, showInventoryItemModal]);

  function resetInventoryCategoryModal(): void {
    setEditingInventoryCategoryId("");
    setInventoryCategoryForm({ name: "", description: "", parentCategoryId: "" });
    setShowInventoryCategoryModal(false);
  }

  function resetInventoryItemModal(): void {
    setEditingInventoryItemId("");
    setInventoryItemForm({ name: "", trackingMode: "quantity", quantity: "", barcode: "", notes: "" });
    setInventoryFieldDrafts([]);
    setDraggedInventoryFieldId("");
    setIsBarcodeCaptureActive(false);
    setBarcodeScanBuffer("");
    setShowInventoryItemModal(false);
  }

  function openCreateInventoryCategory(parentCategoryId = ""): void {
    setEditingInventoryCategoryId("");
    setInventoryCategoryForm({ name: "", description: "", parentCategoryId });
    setShowInventoryCategoryModal(true);
  }

  function openEditInventoryCategory(category: Schema["InventoryCategory"]["type"]): void {
    setEditingInventoryCategoryId(category.id);
    setInventoryCategoryForm({
      name: category.name,
      description: category.description || "",
      parentCategoryId: category.parentCategoryId || "",
    });
    setShowInventoryCategoryModal(true);
  }

  async function saveInventoryCategory(): Promise<void> {
    const permission = editingInventoryCategoryId ? "inventory.update" : "inventory.create";
    if (!can(permission)) {
      openErrorPopup(`Not allowed by policy: ${permission}`);
      return;
    }

    if (!inventoryCategoryForm.name.trim()) {
      openErrorPopup("Category name is required.");
      return;
    }

    try {
      if (editingInventoryCategoryId) {
        await client.models.InventoryCategory.update({
          id: editingInventoryCategoryId,
          name: inventoryCategoryForm.name.trim(),
          description: inventoryCategoryForm.description,
          parentCategoryId: inventoryCategoryForm.parentCategoryId || undefined,
        });
        openSuccessPopup("Category updated.");
      } else {
        const createdCategory = (await client.models.InventoryCategory.create({
          name: inventoryCategoryForm.name.trim(),
          description: inventoryCategoryForm.description,
          parentCategoryId: inventoryCategoryForm.parentCategoryId || undefined,
          isActive: true,
        })) as { data?: { id?: string } };

        if (createdCategory.data?.id) {
          setSelectedInventoryCategoryId(createdCategory.data.id);
          setExpandedInventoryCategoryIds((currentIds) => [...new Set([...currentIds, createdCategory.data?.id || "", inventoryCategoryForm.parentCategoryId])].filter(Boolean));
        }

        openSuccessPopup(inventoryCategoryForm.parentCategoryId ? "Subcategory created." : "Category created.");
      }
      resetInventoryCategoryModal();
    } catch {
      openErrorPopup("Failed to save category.");
    }
  }

  async function removeInventoryCategory(categoryId: string): Promise<void> {
    if (!can("inventory.delete")) {
      openErrorPopup("Not allowed by policy: inventory.delete");
      return;
    }

    if (inventoryCategories.some((category) => category.parentCategoryId === categoryId)) {
      openErrorPopup("Delete subcategories first.");
      return;
    }

    if (inventoryItems.some((item) => item.categoryId === categoryId)) {
      openErrorPopup("Delete items inside this category first.");
      return;
    }

    try {
      const fieldDefinitions = inventoryFieldDefinitions.filter((fieldDefinition) => fieldDefinition.categoryId === categoryId);
      await Promise.all(fieldDefinitions.map((fieldDefinition) => client.models.InventoryFieldDefinition.delete({ id: fieldDefinition.id })));
      await client.models.InventoryCategory.delete({ id: categoryId });
      if (selectedInventoryCategoryId === categoryId) {
        setSelectedInventoryCategoryId("");
      }
      openSuccessPopup("Category deleted.");
    } catch {
      openErrorPopup("Failed to delete category.");
    }
  }

  function openCreateInventoryItem(categoryId: string): void {
    if (!categoryId) {
      openErrorPopup("Choose a category first.");
      return;
    }

    const targetCategory = inventoryCategories.find((category) => category.id === categoryId);
    const targetHasChildren = inventoryCategories.some((category) => category.parentCategoryId === categoryId);
    if (targetCategory && !targetCategory.parentCategoryId && targetHasChildren) {
      openErrorPopup("Create items inside a subcategory. Select a subcategory first.");
      return;
    }

    setEditingInventoryItemId("");
    setInventoryItemForm({ name: "", trackingMode: "quantity", quantity: "", barcode: "", notes: "" });
    setInventoryFieldDrafts(
      inventoryFieldDefinitions
        .filter((fieldDefinition) => fieldDefinition.categoryId === categoryId)
        .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
        .map((fieldDefinition) => ({
          tempId: makeDraftId(),
          definitionId: fieldDefinition.id,
          label: fieldDefinition.label,
          fieldType: fieldDefinition.fieldType as InventoryFieldType,
          value: "",
        }))
    );
      setIsBarcodeCaptureActive(false);
      setBarcodeScanBuffer("");
    setShowInventoryItemModal(true);
  }

  function canCreateItemsInCategory(categoryId: string): boolean {
    const targetCategory = inventoryCategories.find((category) => category.id === categoryId);
    if (!targetCategory) {
      return false;
    }

    const targetHasChildren = inventoryCategories.some((category) => category.parentCategoryId === categoryId);
    if (!targetCategory.parentCategoryId && targetHasChildren) {
      return false;
    }

    return true;
  }

  function openInventoryCsvImportForCategory(categoryId: string): void {
    if (!can("inventory.create")) {
      openErrorPopup("Not allowed by policy: inventory.create");
      return;
    }

    if (!canCreateItemsInCategory(categoryId)) {
      openErrorPopup("Import items into a subcategory. Parent categories only hold subcategories.");
      return;
    }

    setSelectedInventoryCategoryId(categoryId);
    if (csvImportInputRef.current) {
      csvImportInputRef.current.value = "";
      csvImportInputRef.current.click();
    }
  }

  function openEditInventoryItem(item: Schema["InventoryItem"]["type"]): void {
    const definitions = inventoryFieldDefinitions
      .filter((fieldDefinition) => fieldDefinition.categoryId === item.categoryId)
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
    const valuesByDefinitionId = new Map(
      inventoryItemFieldValues.filter((fieldValue) => fieldValue.itemId === item.id).map((fieldValue) => [fieldValue.fieldDefinitionId, fieldValue.value || ""])
    );

    setSelectedInventoryCategoryId(item.categoryId);
    setEditingInventoryItemId(item.id);
    setInventoryItemForm({
      name: item.name,
      trackingMode: item.trackingMode as "quantity" | "barcode",
      quantity: item.quantity?.toString() || "",
      barcode: item.barcode || "",
      notes: item.notes || "",
    });
    setInventoryFieldDrafts(
      definitions.map((fieldDefinition) => ({
        tempId: makeDraftId(),
        definitionId: fieldDefinition.id,
        label: fieldDefinition.label,
        fieldType: fieldDefinition.fieldType as InventoryFieldType,
        value: valuesByDefinitionId.get(fieldDefinition.id) || "",
      }))
    );
    setIsBarcodeCaptureActive(false);
    setBarcodeScanBuffer(item.barcode || "");
    setShowInventoryItemModal(true);
  }

  function addInventoryFieldDraft(): void {
    setInventoryFieldDrafts((currentDrafts) => [
      ...currentDrafts,
      { tempId: makeDraftId(), label: "", fieldType: "text", value: "" },
    ]);
  }

  function updateInventoryFieldDraft(tempId: string, patch: Partial<InventoryFieldDraft>): void {
    setInventoryFieldDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.tempId === tempId ? { ...draft, ...patch } : draft))
    );
  }

  function removeInventoryFieldDraft(tempId: string): void {
    setInventoryFieldDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.tempId !== tempId));
  }

  function moveInventoryFieldDraft(fromTempId: string, toTempId: string): void {
    if (!fromTempId || !toTempId || fromTempId === toTempId) {
      return;
    }

    setInventoryFieldDrafts((currentDrafts) => {
      const fromIndex = currentDrafts.findIndex((draft) => draft.tempId === fromTempId);
      const toIndex = currentDrafts.findIndex((draft) => draft.tempId === toTempId);
      if (fromIndex === -1 || toIndex === -1) {
        return currentDrafts;
      }

      const nextDrafts = [...currentDrafts];
      const [movedDraft] = nextDrafts.splice(fromIndex, 1);
      nextDrafts.splice(toIndex, 0, movedDraft);
      return nextDrafts;
    });
  }

  function startBarcodeCapture(): void {
    setBarcodeScanBuffer("");
    setInventoryItemForm((currentForm) => ({ ...currentForm, barcode: "" }));
    setIsBarcodeCaptureActive(true);
  }

  function stopBarcodeCapture(): void {
    setIsBarcodeCaptureActive(false);
  }

  function toggleInventoryCategoryExpansion(categoryId: string): void {
    setExpandedInventoryCategoryIds((currentIds) =>
      currentIds.includes(categoryId) ? currentIds.filter((entryId) => entryId !== categoryId) : [...currentIds, categoryId]
    );
  }

  function expandAllInventoryCategories(): void {
    setExpandedInventoryCategoryIds(inventoryCategories.map((category) => category.id));
  }

  function collapseAllInventoryCategories(): void {
    setExpandedInventoryCategoryIds([]);
  }

  function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }

  async function prepareInventoryCsvImport(file: File): Promise<void> {
    if (!can("inventory.create")) {
      openErrorPopup("Not allowed by policy: inventory.create");
      return;
    }

    if (!selectedInventoryCategoryId) {
      openErrorPopup("Choose a category before importing CSV items.");
      return;
    }

    if (!canCreateItemsInSelectedCategory) {
      openErrorPopup("Import into a subcategory. Select a subcategory first.");
      return;
    }

    try {
      const csvText = await file.text();
      const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (lines.length < 2) {
        openErrorPopup("CSV must include a header row and at least one item row.");
        return;
      }

      const headers = parseCsvLine(lines[0]).map((header) => header.trim());
      const rows = lines.slice(1).map((line) => parseCsvLine(line));
      const suggestedMapping = headers.reduce<Record<string, InventoryCsvMapping>>((accumulator, header) => {
        const normalizedHeader = header.toLowerCase();
        if (normalizedHeader === "name") accumulator[header] = "name";
        else if (normalizedHeader === "trackingmode") accumulator[header] = "trackingMode";
        else if (normalizedHeader === "quantity") accumulator[header] = "quantity";
        else if (normalizedHeader === "barcode") accumulator[header] = "barcode";
        else if (normalizedHeader === "notes") accumulator[header] = "notes";
        else accumulator[header] = "custom";
        return accumulator;
      }, {});

      setInventoryCsvPreview({ fileName: file.name, headers, rows });
      setInventoryCsvMapping(suggestedMapping);
      setShowInventoryCsvImportModal(true);
    } catch {
      openErrorPopup("Failed to import CSV items.");
    }
  }

  function closeInventoryCsvImportModal(): void {
    setShowInventoryCsvImportModal(false);
    setInventoryCsvPreview(null);
    setInventoryCsvMapping({});
    if (csvImportInputRef.current) {
      csvImportInputRef.current.value = "";
    }
  }

  function downloadInventoryCsvTemplate(categoryId = selectedInventoryCategoryId): void {
    if (!categoryId) {
      openErrorPopup("Choose a category before downloading a CSV template.");
      return;
    }

    if (!canCreateItemsInCategory(categoryId)) {
      openErrorPopup("Download a template from a subcategory where items are created.");
      return;
    }

    const targetCategory = inventoryCategories.find((category) => category.id === categoryId);
    const categoryFieldDefinitions = inventoryFieldDefinitions
      .filter((fieldDefinition) => fieldDefinition.categoryId === categoryId)
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0));

    const headers = ["name", "trackingMode", "quantity", "barcode", "notes", ...categoryFieldDefinitions.map((fieldDefinition) => fieldDefinition.label)];
    const sampleRow = [
      "Sample Item",
      "quantity",
      "10",
      "",
      "Optional note",
      ...categoryFieldDefinitions.map(() => "sample value"),
    ];

    const csvContent = [headers.join(","), sampleRow.map((value) => `"${String(value).split('"').join('""')}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${targetCategory?.name || "inventory"}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
    openSuccessPopup("CSV template download started.");
  }

  async function commitInventoryCsvImport(): Promise<void> {
    if (!inventoryCsvPreview || !selectedInventoryCategoryId) {
      openErrorPopup("CSV preview is not ready.");
      return;
    }

    const nameHeader = inventoryCsvPreview.headers.find((header) => inventoryCsvMapping[header] === "name");
    if (!nameHeader) {
      openErrorPopup("Map one column to Name before importing.");
      return;
    }

    const invalidRows = inventoryCsvRowValidations.filter((rowValidation) => rowValidation.errors.length > 0);
    if (invalidRows.length > 0) {
      openErrorPopup("Fix CSV validation errors before importing.");
      return;
    }

    try {
      const headerMap = inventoryCsvPreview.headers.reduce<Record<string, number>>((accumulator, header, index) => {
        accumulator[header] = index;
        return accumulator;
      }, {});
      const existingDefinitionsByLabel = new Map(
        selectedCategoryFieldDefinitions.map((fieldDefinition) => [fieldDefinition.label.toLowerCase(), fieldDefinition])
      );

      let importedCount = 0;
      for (const row of inventoryCsvPreview.rows) {
        const name = row[headerMap[nameHeader]]?.trim();
        if (!name) {
          continue;
        }

        const trackingHeader = inventoryCsvPreview.headers.find((header) => inventoryCsvMapping[header] === "trackingMode");
        const quantityHeader = inventoryCsvPreview.headers.find((header) => inventoryCsvMapping[header] === "quantity");
        const barcodeHeader = inventoryCsvPreview.headers.find((header) => inventoryCsvMapping[header] === "barcode");
        const notesHeader = inventoryCsvPreview.headers.find((header) => inventoryCsvMapping[header] === "notes");
        const trackingMode = ((trackingHeader ? row[headerMap[trackingHeader]] : "") || (barcodeHeader ? "barcode" : "quantity")).trim().toLowerCase() as "quantity" | "barcode";

        const createdItem = (await client.models.InventoryItem.create({
          categoryId: selectedInventoryCategoryId,
          name,
          trackingMode,
          quantity: trackingMode === "quantity" && quantityHeader ? Number(row[headerMap[quantityHeader]] || 0) : undefined,
          barcode: trackingMode === "barcode" && barcodeHeader ? row[headerMap[barcodeHeader]]?.trim() || undefined : undefined,
          notes: notesHeader ? row[headerMap[notesHeader]]?.trim() || undefined : undefined,
          isActive: true,
        })) as { data?: { id?: string } };

        const itemId = createdItem.data?.id;
        if (!itemId) {
          continue;
        }

        for (const header of inventoryCsvPreview.headers) {
          if (inventoryCsvMapping[header] !== "custom") {
            continue;
          }

          const value = row[headerMap[header]]?.trim();
          if (!value) {
            continue;
          }

          const normalizedHeader = header.toLowerCase();
          let fieldDefinition = existingDefinitionsByLabel.get(normalizedHeader);
          if (!fieldDefinition) {
            const createdDefinition = (await client.models.InventoryFieldDefinition.create({
              categoryId: selectedInventoryCategoryId,
              label: header,
              fieldType: "text",
              position: existingDefinitionsByLabel.size,
              isActive: true,
            })) as { data?: { id?: string } };

            if (!createdDefinition.data?.id) {
              continue;
            }

            fieldDefinition = {
              id: createdDefinition.data.id,
              categoryId: selectedInventoryCategoryId,
              label: header,
              fieldType: "text",
              position: existingDefinitionsByLabel.size,
            } as Schema["InventoryFieldDefinition"]["type"];
            existingDefinitionsByLabel.set(normalizedHeader, fieldDefinition);
          }

          await client.models.InventoryItemFieldValue.create({
            itemId,
            fieldDefinitionId: fieldDefinition.id,
            value,
            isActive: true,
          });
        }

        importedCount += 1;
      }

      closeInventoryCsvImportModal();
      openSuccessPopup(`${importedCount} item${importedCount === 1 ? "" : "s"} imported from CSV.`);
    } catch {
      openErrorPopup("Failed to import CSV items.");
    }
  }

  function exportSelectedCategoryItemsToCsv(categoryId = selectedInventoryCategoryId): void {
    if (!categoryId) {
      openErrorPopup("Choose a category before exporting.");
      return;
    }

    const targetCategory = inventoryCategories.find((category) => category.id === categoryId);
    const categoryItems = inventoryItems.filter((item) => item.categoryId === categoryId);
    const categoryFieldDefinitions = inventoryFieldDefinitions
      .filter((fieldDefinition) => fieldDefinition.categoryId === categoryId)
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0));

    if (categoryItems.length === 0) {
      openErrorPopup("There are no items to export in this category.");
      return;
    }

    const customHeaders = categoryFieldDefinitions.map((fieldDefinition) => fieldDefinition.label);
    const headers = ["name", "trackingMode", "quantity", "barcode", "notes", ...customHeaders];
    const definitionsByLabel = new Map(categoryFieldDefinitions.map((fieldDefinition) => [fieldDefinition.label, fieldDefinition.id]));

    const csvRows = categoryItems.map((item) => {
      const customValues = customHeaders.map((header) => {
        const definitionId = definitionsByLabel.get(header);
        const value = inventoryItemFieldValues.find(
          (fieldValue) => fieldValue.itemId === item.id && fieldValue.fieldDefinitionId === definitionId
        )?.value || "";
        return `"${String(value).split('"').join('""')}"`;
      });

      return [
        item.name,
        item.trackingMode,
        item.quantity ?? "",
        item.barcode || "",
        item.notes || "",
        ...customValues.map((value) => value.slice(1, -1)),
      ]
        .map((value) => `"${String(value).split('"').join('""')}"`)
        .join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${targetCategory?.name || "inventory"}-items.csv`;
    link.click();
    URL.revokeObjectURL(url);
    openSuccessPopup("CSV export started.");
  }

  function toggleInventoryItemSelection(itemId: string): void {
    setSelectedInventoryItemIds((currentIds) =>
      currentIds.includes(itemId) ? currentIds.filter((entryId) => entryId !== itemId) : [...currentIds, itemId]
    );
  }

  async function saveInventoryItem(): Promise<void> {
    const permission = editingInventoryItemId ? "inventory.update" : "inventory.create";
    if (!can(permission)) {
      openErrorPopup(`Not allowed by policy: ${permission}`);
      return;
    }

    if (!selectedInventoryCategoryId) {
      openErrorPopup("Choose a category first.");
      return;
    }

    if (!inventoryItemForm.name.trim()) {
      openErrorPopup("Item name is required.");
      return;
    }

    if (inventoryItemForm.trackingMode === "quantity" && inventoryItemForm.quantity === "") {
      openErrorPopup("Quantity is required for quantity-based items.");
      return;
    }

    if (inventoryItemForm.trackingMode === "barcode" && !inventoryItemForm.barcode.trim()) {
      openErrorPopup("Barcode is required for barcode-based items.");
      return;
    }

    try {
      let itemId = editingInventoryItemId;

      if (editingInventoryItemId) {
        await client.models.InventoryItem.update({
          id: editingInventoryItemId,
          categoryId: selectedInventoryCategoryId,
          name: inventoryItemForm.name.trim(),
          trackingMode: inventoryItemForm.trackingMode,
          quantity: inventoryItemForm.trackingMode === "quantity" ? Number(inventoryItemForm.quantity || 0) : undefined,
          barcode: inventoryItemForm.trackingMode === "barcode" ? inventoryItemForm.barcode.trim() : undefined,
          notes: inventoryItemForm.notes,
        });
      } else {
        const createdItem = (await client.models.InventoryItem.create({
          categoryId: selectedInventoryCategoryId,
          name: inventoryItemForm.name.trim(),
          trackingMode: inventoryItemForm.trackingMode,
          quantity: inventoryItemForm.trackingMode === "quantity" ? Number(inventoryItemForm.quantity || 0) : undefined,
          barcode: inventoryItemForm.trackingMode === "barcode" ? inventoryItemForm.barcode.trim() : undefined,
          notes: inventoryItemForm.notes,
          isActive: true,
        })) as { data?: { id?: string } };
        itemId = createdItem.data?.id || "";
      }

      if (!itemId) {
        throw new Error("Missing item id");
      }

      for (const [index, draft] of inventoryFieldDrafts.entries()) {
        if (!draft.label.trim()) {
          continue;
        }

        let fieldDefinitionId = draft.definitionId;
        if (!fieldDefinitionId) {
          const createdFieldDefinition = (await client.models.InventoryFieldDefinition.create({
            categoryId: selectedInventoryCategoryId,
            label: draft.label.trim(),
            fieldType: draft.fieldType,
            position: index,
            isActive: true,
          })) as { data?: { id?: string } };
          fieldDefinitionId = createdFieldDefinition.data?.id;
        } else {
          await client.models.InventoryFieldDefinition.update({ id: fieldDefinitionId, position: index });
        }

        if (!fieldDefinitionId) {
          continue;
        }

        const existingFieldValue = inventoryItemFieldValues.find(
          (fieldValue) => fieldValue.itemId === itemId && fieldValue.fieldDefinitionId === fieldDefinitionId
        );

        if (existingFieldValue) {
          await client.models.InventoryItemFieldValue.update({ id: existingFieldValue.id, value: draft.value });
        } else {
          await client.models.InventoryItemFieldValue.create({
            itemId,
            fieldDefinitionId,
            value: draft.value,
            isActive: true,
          });
        }
      }

      resetInventoryItemModal();
      openSuccessPopup(editingInventoryItemId ? "Item updated." : "Item created.");
    } catch {
      openErrorPopup("Failed to save inventory item.");
    }
  }

  async function removeInventoryItem(itemId: string): Promise<void> {
    if (!can("inventory.delete")) {
      openErrorPopup("Not allowed by policy: inventory.delete");
      return;
    }

    try {
      const values = inventoryItemFieldValues.filter((fieldValue) => fieldValue.itemId === itemId);
      await Promise.all(values.map((fieldValue) => client.models.InventoryItemFieldValue.delete({ id: fieldValue.id })));
      await client.models.InventoryItem.delete({ id: itemId });
      openSuccessPopup("Item deleted.");
    } catch {
      openErrorPopup("Failed to delete item.");
    }
  }

  async function createSupplier(): Promise<void> {
    if (!can("supplier.create")) {
      openErrorPopup("Not allowed by policy: supplier.create");
      return;
    }

    if (!supplierForm.firstName || !supplierForm.lastName) {
      openErrorPopup("Supplier first and last name are required.");
      return;
    }

    try {
      await client.models.Supplier.create({ ...supplierForm, isActive: true });
      setSupplierForm({ firstName: "", lastName: "", phone: "", email: "", address: "", notes: "" });
      setShowSupplierModal(false);
      openSuccessPopup("Supplier saved.");
    } catch {
      openErrorPopup("Failed to save supplier.");
    }
  }

  async function updateSupplier(): Promise<void> {
    if (!can("supplier.update")) {
      openErrorPopup("Not allowed by policy: supplier.update");
      return;
    }

    if (!editingSupplierId) {
      openErrorPopup("Choose a supplier to update.");
      return;
    }

    try {
      await client.models.Supplier.update({ id: editingSupplierId, ...supplierForm });
      setEditingSupplierId("");
      setSupplierForm({ firstName: "", lastName: "", phone: "", email: "", address: "", notes: "" });
      setShowSupplierModal(false);
      openSuccessPopup("Supplier updated.");
    } catch {
      openErrorPopup("Failed to update supplier.");
    }
  }

  async function removeSupplier(id: string): Promise<void> {
    if (!can("supplier.delete")) {
      openErrorPopup("Not allowed by policy: supplier.delete");
      return;
    }

    try {
      await client.models.Supplier.delete({ id });
      if (selectedSupplierId === id) {
        setSelectedSupplierId("");
      }
      openSuccessPopup("Supplier deleted.");
    } catch {
      openErrorPopup("Failed to delete supplier.");
    }
  }

  async function sendSupplierEmail(): Promise<void> {
    if (!can("supplier.email.send")) {
      openErrorPopup("Not allowed by policy: supplier.email.send");
      return;
    }

    if (!selectedSupplier?.email) {
      openErrorPopup("Supplier has no email.");
      return;
    }

    try {
      await client.models.SupplierEmailLog.create({
        supplierId: selectedSupplier.id,
        subject: emailForm.subject || "Supplier Message",
        htmlContent: emailForm.htmlContent,
        sentByUserId: currentAppUser?.id,
        sentAt: new Date().toISOString(),
        status: "SENT",
      });

      const mailto = `mailto:${encodeURIComponent(selectedSupplier.email)}?subject=${encodeURIComponent(
        emailForm.subject || "Supplier Message"
      )}&body=${encodeURIComponent(emailForm.htmlContent)}`;
      window.open(mailto, "_blank");
      openSuccessPopup("Email draft opened and saved in logs.");
    } catch {
      openErrorPopup("Failed to create email log.");
    }
  }

  async function createDepartment(): Promise<void> {
    if (!can("department.manage")) {
      openErrorPopup("Not allowed by policy: department.manage");
      return;
    }

    if (!departmentForm.name) {
      openErrorPopup("Department name is required.");
      return;
    }

    try {
      await client.models.Department.create({ ...departmentForm, isActive: true });
      setDepartmentForm({ name: "", description: "" });
      openSuccessPopup("Department created.");
    } catch {
      openErrorPopup("Failed to create department.");
    }
  }

  async function createRole(): Promise<void> {
    if (!can("role.manage")) {
      openErrorPopup("Not allowed by policy: role.manage");
      return;
    }

    if (!roleForm.name) {
      openErrorPopup("Role name is required.");
      return;
    }

    try {
      await client.models.Role.create({ ...roleForm, isSystem: false, isActive: true });
      setRoleForm({ name: "", description: "" });
      openSuccessPopup("Role created.");
    } catch {
      openErrorPopup("Failed to create role.");
    }
  }

  async function createPolicy(): Promise<void> {
    if (!can("policy.manage")) {
      openErrorPopup("Not allowed by policy: policy.manage");
      return;
    }

    if (!policyForm.key || !policyForm.module) {
      openErrorPopup("Policy key and module are required.");
      return;
    }

    try {
      await client.models.Policy.create({ ...policyForm, isActive: true });
      setPolicyForm({ key: "", module: "admin", description: "" });
      openSuccessPopup("Policy created.");
    } catch {
      openErrorPopup("Failed to create policy.");
    }
  }

  async function createAppUserByAdmin(): Promise<void> {
    if (!can("user.manage")) {
      openErrorPopup("Not allowed by policy: user.manage");
      return;
    }

    if (!adminUserForm.email || !adminUserForm.firstName || !adminUserForm.lastName) {
      openErrorPopup("User email, first name, and last name are required.");
      return;
    }

    try {
      await client.models.AppUser.create({
        ...adminUserForm,
        departmentId: adminUserForm.departmentId || undefined,
        isActive: true,
      });

      setAdminUserForm({ email: "", firstName: "", lastName: "", isAdmin: false, departmentId: "" });
      openSuccessPopup("User created.");
    } catch {
      openErrorPopup("Failed to create user.");
    }
  }

  async function assignRoleToUser(): Promise<void> {
    if (!can("user.role.assign")) {
      openErrorPopup("Not allowed by policy: user.role.assign");
      return;
    }

    if (!roleAssignment.userId || !roleAssignment.roleId) {
      openErrorPopup("Choose user and role.");
      return;
    }

    try {
      await client.models.UserRole.create({ ...roleAssignment, isActive: true });
      setRoleAssignment({ userId: "", roleId: "" });
      openSuccessPopup("Role assigned to user.");
    } catch {
      openErrorPopup("Failed to assign role to user.");
    }
  }

  async function assignPolicyToRole(): Promise<void> {
    if (!can("role.policy.assign")) {
      openErrorPopup("Not allowed by policy: role.policy.assign");
      return;
    }

    if (!policyAssignment.roleId || !policyAssignment.policyId) {
      openErrorPopup("Choose role and policy.");
      return;
    }

    try {
      await client.models.RolePolicy.create({ ...policyAssignment, isActive: true });
      setPolicyAssignment({ roleId: "", policyId: "" });
      openSuccessPopup("Policy assigned to role.");
    } catch {
      openErrorPopup("Failed to assign policy to role.");
    }
  }

  function renderInventoryFieldValueInput(fieldDraft: InventoryFieldDraft): JSX.Element {
    if (fieldDraft.fieldType === "textarea") {
      return (
        <textarea
          placeholder="Value"
          value={fieldDraft.value}
          onChange={(e) => updateInventoryFieldDraft(fieldDraft.tempId, { value: e.target.value })}
        />
      );
    }

    if (fieldDraft.fieldType === "boolean") {
      return (
        <select value={fieldDraft.value} onChange={(e) => updateInventoryFieldDraft(fieldDraft.tempId, { value: e.target.value })}>
          <option value="">Select value</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    return (
      <input
        type={fieldDraft.fieldType === "number" || fieldDraft.fieldType === "date" ? fieldDraft.fieldType : "text"}
        placeholder="Value"
        value={fieldDraft.value}
        onChange={(e) => updateInventoryFieldDraft(fieldDraft.tempId, { value: e.target.value })}
      />
    );
  }

  function renderInventoryCategoryTree(parentCategoryId = "", depth = 0): JSX.Element[] {
    const categories = (inventoryCategoryChildrenMap[parentCategoryId || "root"] || []).filter((category) => matchingInventoryCategoryIds.has(category.id));

    return categories.map((category) => {
      const childCategories = (inventoryCategoryChildrenMap[category.id] || []).filter((childCategory) => matchingInventoryCategoryIds.has(childCategory.id));
      const categoryItems = inventoryItemsByCategoryMap[category.id] || [];
      const itemCount = categoryItems.length;
      const childCount = childCategories.length;
      const hasChildren = childCount > 0;
      const hasExpandableContent = hasChildren || itemCount > 0;
      const isExpanded = expandedInventoryCategoryIds.includes(category.id);

      return (
        <article key={category.id} className="inventory-tree-node" style={{ ["--tree-depth" as string]: String(depth) }}>
          <div
            className={`inventory-tree-card inventory-tree-row ${selectedInventoryCategoryId === category.id ? "selected" : ""}`}
            onClick={() => {
              setSelectedInventoryCategoryId(category.id);
              if (hasExpandableContent) {
                toggleInventoryCategoryExpansion(category.id);
              }
            }}
          >
            <div className="inventory-tree-row-main">
              <button
                className={`inventory-expand-toggle ${hasExpandableContent ? "has-children" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasExpandableContent) {
                    toggleInventoryCategoryExpansion(category.id);
                  }
                }}
                aria-label={isExpanded ? "Collapse category" : "Expand category"}
              >
                {hasExpandableContent ? (isExpanded ? "▾" : "▸") : "•"}
              </button>

              <div>
                <h3>{category.name}</h3>
                <p>{category.description || "No description provided."}</p>
              </div>
            </div>

            <div className="inventory-tree-row-side" onClick={(e) => e.stopPropagation()}>
              <div className="inventory-meta-row">
                <span>{depth === 0 ? "Category" : "Subcategory"}</span>
                <span>{childCount} subcategories</span>
                <span>{itemCount} items</span>
              </div>
              <details className="inventory-actions-menu">
                <summary className="small">Actions ▾</summary>
                <div className="inventory-actions-popover">
                  <button className="small" disabled={!can("inventory.create") || !canCreateItemsInCategory(category.id)} onClick={() => openCreateInventoryItem(category.id)}>Create Item</button>
                  <button className="small" disabled={!can("inventory.create")} onClick={() => openCreateInventoryCategory(category.id)}>Create Subcategory</button>
                  <button className="small" disabled={!can("inventory.create") || !canCreateItemsInCategory(category.id)} onClick={() => openInventoryCsvImportForCategory(category.id)}>Import CSV</button>
                  <button className="small" disabled={!can("inventory.create") || !canCreateItemsInCategory(category.id)} onClick={() => downloadInventoryCsvTemplate(category.id)}>CSV Template</button>
                  <button className="small" disabled={!can("inventory.view")} onClick={() => exportSelectedCategoryItemsToCsv(category.id)}>Export CSV</button>
                  <button className="small" disabled={!can("inventory.update")} onClick={() => openEditInventoryCategory(category)}>Edit Category</button>
                  <button className="small danger" disabled={!can("inventory.delete")} onClick={() => removeInventoryCategory(category.id)}>Delete Category</button>
                </div>
              </details>
            </div>
          </div>

          {isExpanded && (
            <div className="inventory-tree-children">
              {hasChildren ? (
                renderInventoryCategoryTree(category.id, depth + 1)
              ) : itemCount > 0 ? (
                <div className="inventory-item-row-stack">
                  {categoryItems.map((item) => (
                    <article key={item.id} className={`inventory-item-row ${selectedInventoryItemIds.includes(item.id) ? "selected" : ""}`}>
                      <div className="inventory-item-row-main">
                        <label className="inventory-item-check" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedInventoryItemIds.includes(item.id)} onChange={() => toggleInventoryItemSelection(item.id)} />
                        </label>
                        <div>
                          <h4>{item.name}</h4>
                          <p>{item.trackingMode === "quantity" ? `Quantity: ${item.quantity ?? 0}` : `Barcode: ${item.barcode || "-"}`}</p>
                        </div>
                      </div>
                      <div className="inline-actions">
                        <button className="small" disabled={!can("inventory.update")} onClick={() => openEditInventoryItem(item)}>Edit</button>
                        <button className="small danger" disabled={!can("inventory.delete")} onClick={() => removeInventoryItem(item.id)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="inventory-empty-inline-row">No subcategories or items inside this category yet.</div>
              )}
            </div>
          )}
        </article>
      );
    });
  }

  const supplierWhatsappUrl = selectedSupplier?.phone
    ? `https://wa.me/${digitsOnly(selectedSupplier.phone)}`
    : "#";

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="kicker">Amplify ERP</p>
          <h1>Inventory + Supplier + Admin Policy Control</h1>
          <p>Every action and button is policy-gated. Admin can control departments, roles, policies, and users.</p>
        </div>
        <div className="hero-actions">
          <button className={page === "supplier" || page === "supplierDetails" ? "active" : ""} onClick={() => setPage("supplier")}>Supplier</button>
          <button className={page === "inventory" ? "active" : ""} onClick={() => setPage("inventory")}>Inventory</button>
          <button className={page === "admin" ? "active" : ""} onClick={() => setPage("admin")}>Admin</button>
          <button className="ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className="policy-banner">
        <strong>Logged in as:</strong> {currentAppUser ? `${currentAppUser.firstName} ${currentAppUser.lastName}` : "Unknown"}
        <span className="badge">{currentAppUser?.isAdmin ? "ADMIN" : "USER"}</span>
      </div>

      {popup.open && (
        <div className="feedback-popup-overlay" onClick={closePopup}>
          <div className={`feedback-popup ${popup.type}`} onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon">{popup.type === "success" ? "✓" : "✕"}</div>
            <h3>{popup.title}</h3>
            <p>{popup.message}</p>
            <button onClick={closePopup}>OK</button>
            <span className="popup-hint">Press Esc to dismiss</span>
          </div>
        </div>
      )}

      {statusMessage && <div className="status">{statusMessage}</div>}

      {page === "supplier" && (
        <section className="layout-grid">
          <article className="card span-12">
            <div className="row-top">
              <h2>Supplier List</h2>
              <div className="row-top-actions">
                <input
                  className="search"
                  placeholder="Search by name, email, phone"
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                />
                <button
                  disabled={!can("supplier.create")}
                  onClick={() => {
                    setEditingSupplierId("");
                    setSupplierForm({ firstName: "", lastName: "", email: "", phone: "", address: "", notes: "" });
                    setShowSupplierModal(true);
                  }}
                >
                  + Create Supplier
                </button>
              </div>
            </div>

            <div className="supplier-list-grid">
              {pagedSuppliers.map((s, index) => (
                <article key={s.id} className="supplier-list-card" style={{ animationDelay: `${index * 55}ms` }} onClick={() => setSelectedSupplierId(s.id)}>
                  <div className="supplier-list-head">
                    <h3>{s.firstName} {s.lastName}</h3>
                    <span className="supplier-pill">Supplier</span>
                  </div>
                  <p><strong>Email:</strong> {s.email || "-"}</p>
                  <p><strong>Phone:</strong> {s.phone || "-"}</p>
                  <p><strong>Address:</strong> {s.address || "-"}</p>
                  <div className="inline-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="small"
                      onClick={() => {
                        setSelectedSupplierId(s.id);
                        setPage("supplierDetails");
                      }}
                    >
                      View
                    </button>
                    <button
                      className="small"
                      disabled={!can("supplier.update")}
                      onClick={() => {
                        setEditingSupplierId(s.id);
                        setSupplierForm({
                          firstName: s.firstName,
                          lastName: s.lastName,
                          email: s.email || "",
                          phone: s.phone || "",
                          address: s.address || "",
                          notes: s.notes || "",
                        });
                        setShowSupplierModal(true);
                      }}
                    >
                      Edit
                    </button>
                    <button className="small danger" disabled={!can("supplier.delete")} onClick={() => removeSupplier(s.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>

            {supplierTotalPages > 1 && (
              <div className="pagination">
                <button
                  className="ghost small"
                  disabled={supplierPage === 1}
                  onClick={() => setSupplierPage((p) => p - 1)}
                >
                  ‹ Prev
                </button>
                {Array.from({ length: supplierTotalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`small pag-btn ${n === supplierPage ? "active" : "ghost"}`}
                    onClick={() => setSupplierPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="ghost small"
                  disabled={supplierPage === supplierTotalPages}
                  onClick={() => setSupplierPage((p) => p + 1)}
                >
                  Next ›
                </button>
                <span className="pag-info">{filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </article>

          {showSupplierModal && (
            <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingSupplierId ? "Edit Supplier" : "New Supplier"}</h2>
                  <button className="modal-close ghost" title="Close (Esc)" onClick={() => setShowSupplierModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="field-grid">
                    <input placeholder="First name" value={supplierForm.firstName} onChange={(e) => setSupplierForm((v) => ({ ...v, firstName: e.target.value }))} />
                    <input placeholder="Last name" value={supplierForm.lastName} onChange={(e) => setSupplierForm((v) => ({ ...v, lastName: e.target.value }))} />
                    <input placeholder="Email" value={supplierForm.email} onChange={(e) => setSupplierForm((v) => ({ ...v, email: e.target.value }))} />
                    <input placeholder="Phone" value={supplierForm.phone} onChange={(e) => setSupplierForm((v) => ({ ...v, phone: e.target.value }))} />
                    <input className="span-2" placeholder="Address" value={supplierForm.address} onChange={(e) => setSupplierForm((v) => ({ ...v, address: e.target.value }))} />
                    <textarea className="span-2" placeholder="Notes" value={supplierForm.notes} onChange={(e) => setSupplierForm((v) => ({ ...v, notes: e.target.value }))} />
                  </div>
                  <div className="button-row">
                    {editingSupplierId ? (
                      <button disabled={!can("supplier.update")} onClick={updateSupplier}>Update Supplier</button>
                    ) : (
                      <button disabled={!can("supplier.create")} onClick={createSupplier}>Save Supplier</button>
                    )}
                    <button className="ghost" onClick={() => {
                      setShowSupplierModal(false);
                      setEditingSupplierId("");
                      setSupplierForm({ firstName: "", lastName: "", email: "", phone: "", address: "", notes: "" });
                    }}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {page === "supplierDetails" && (
        <section className="layout-grid">
          <article className="card span-12">
            <div className="row-top">
              <h2>Supplier Details Page</h2>
              <button className="ghost" onClick={() => setPage("supplier")}>Back To Supplier List</button>
            </div>

            {!selectedSupplier ? (
              <p>Select a supplier from Supplier page first.</p>
            ) : (
              <div className="details-grid">
                <div className="details-box">
                  <h3>{selectedSupplier.firstName} {selectedSupplier.lastName}</h3>
                  <p><strong>Email:</strong> {selectedSupplier.email || "-"}</p>
                  <p><strong>Phone:</strong> {selectedSupplier.phone || "-"}</p>
                  <p><strong>Address:</strong> {selectedSupplier.address || "-"}</p>
                  <p><strong>Notes:</strong> {selectedSupplier.notes || "-"}</p>
                  <div className="button-row">
                    <a className={`button-link ${!can("supplier.contact") || !selectedSupplier.phone ? "disabled" : ""}`} href={can("supplier.contact") && selectedSupplier.phone ? supplierWhatsappUrl : "#"} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                    <a className={`button-link ${!can("supplier.contact") || !selectedSupplier.email ? "disabled" : ""}`} href={can("supplier.contact") && selectedSupplier.email ? `mailto:${selectedSupplier.email}` : "#"}>
                      Email
                    </a>
                  </div>
                </div>

                <div className="details-box">
                  <h3>Send HTML Email</h3>
                  <input placeholder="Subject" value={emailForm.subject} onChange={(e) => setEmailForm((v) => ({ ...v, subject: e.target.value }))} />
                  <textarea
                    className="html-editor"
                    placeholder="HTML content"
                    value={emailForm.htmlContent}
                    onChange={(e) => setEmailForm((v) => ({ ...v, htmlContent: e.target.value }))}
                  />
                  <button disabled={!can("supplier.email.send")} onClick={sendSupplierEmail}>Send To Supplier</button>
                </div>
              </div>
            )}
          </article>
        </section>
      )}

      {page === "inventory" && (
        <section className="inventory-layout">
          <article className="card inventory-sidebar-card">
            <div className="inventory-pane-head inventory-pane-head-stack">
              <div>
                <h2>Inventory Categories</h2>
                <p className="section-copy">Build a clean catalog first, then drill into subcategories and items.</p>
              </div>
              <button disabled={!can("inventory.create")} onClick={() => openCreateInventoryCategory()}>+ Category</button>
            </div>

            <div className="inventory-tree-toolbar">
              <button className="ghost small" onClick={expandAllInventoryCategories}>Expand All</button>
              <button className="ghost small" onClick={collapseAllInventoryCategories}>Collapse All</button>
            </div>

            <input
              className="inventory-search"
              placeholder="Search categories"
              value={inventoryCategorySearch}
              onChange={(e) => setInventoryCategorySearch(e.target.value)}
            />

            <div className="inventory-category-stack">
              {topLevelInventoryCategories.length === 0 ? (
                <div className="inventory-empty-state compact">
                  <h3>No categories yet</h3>
                  <p>Create your first category to start structuring inventory.</p>
                </div>
              ) : renderInventoryCategoryTree().length === 0 ? (
                <div className="inventory-empty-state compact">
                  <h3>No matching categories</h3>
                  <p>Try a different category search term.</p>
                </div>
              ) : (
                renderInventoryCategoryTree()
              )}
            </div>

            <input
              ref={csvImportInputRef}
              type="file"
              accept=".csv,text/csv"
              className="visually-hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void prepareInventoryCsvImport(file);
                }
              }}
            />
          </article>

          {showInventoryCategoryModal && (
            <div className="modal-overlay" onClick={resetInventoryCategoryModal}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingInventoryCategoryId ? "Edit Category" : inventoryCategoryForm.parentCategoryId ? "New Subcategory" : "New Category"}</h2>
                  <button className="modal-close ghost" title="Close (Esc)" onClick={resetInventoryCategoryModal}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="field-grid single">
                    <input placeholder="Category name" value={inventoryCategoryForm.name} onChange={(e) => setInventoryCategoryForm((currentForm) => ({ ...currentForm, name: e.target.value }))} />
                    <textarea placeholder="Description" value={inventoryCategoryForm.description} onChange={(e) => setInventoryCategoryForm((currentForm) => ({ ...currentForm, description: e.target.value }))} />
                  </div>
                  {inventoryCategoryForm.parentCategoryId && <p className="helper-copy">This will be created under the selected category.</p>}
                  <div className="button-row">
                    <button onClick={saveInventoryCategory}>{editingInventoryCategoryId ? "Update Category" : "Save Category"}</button>
                    <button className="ghost" onClick={resetInventoryCategoryModal}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showInventoryItemModal && (
            <div className="modal-overlay" onClick={resetInventoryItemModal}>
              <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingInventoryItemId ? "Edit Item" : "New Item"}</h2>
                  <button className="modal-close ghost" title="Close (Esc)" onClick={resetInventoryItemModal}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="field-grid">
                    <input placeholder="Item name" value={inventoryItemForm.name} onChange={(e) => setInventoryItemForm((currentForm) => ({ ...currentForm, name: e.target.value }))} />
                    <textarea placeholder="Item notes" value={inventoryItemForm.notes} onChange={(e) => setInventoryItemForm((currentForm) => ({ ...currentForm, notes: e.target.value }))} />
                  </div>

                  <div className="inventory-mode-toggle">
                    <button className={inventoryItemForm.trackingMode === "quantity" ? "active" : "ghost"} onClick={() => setInventoryItemForm((currentForm) => ({ ...currentForm, trackingMode: "quantity", barcode: "" }))}>Track By Quantity</button>
                    <button className={inventoryItemForm.trackingMode === "barcode" ? "active" : "ghost"} onClick={() => setInventoryItemForm((currentForm) => ({ ...currentForm, trackingMode: "barcode", quantity: "" }))}>Track By Barcode</button>
                  </div>

                  <div className="field-grid single inventory-mode-input">
                    {inventoryItemForm.trackingMode === "quantity" ? (
                      <input type="number" placeholder="Quantity" value={inventoryItemForm.quantity} onChange={(e) => setInventoryItemForm((currentForm) => ({ ...currentForm, quantity: e.target.value }))} />
                    ) : (
                      <div className="barcode-scan-panel">
                        <div className="barcode-scan-head">
                          <div>
                            <h3>Barcode Scan Flow</h3>
                            <p className="helper-copy">Click start, scan with your barcode reader, then let Enter finalize the value.</p>
                          </div>
                          <div className="button-row inventory-toolbar">
                            {!isBarcodeCaptureActive ? (
                              <button className="small" onClick={startBarcodeCapture}>Start Scan</button>
                            ) : (
                              <button className="small danger" onClick={stopBarcodeCapture}>Stop Scan</button>
                            )}
                          </div>
                        </div>
                        <div className={`barcode-scan-screen ${isBarcodeCaptureActive ? "active" : ""}`}>
                          <span className="barcode-scan-label">{isBarcodeCaptureActive ? "Scanner listening" : "Last captured barcode"}</span>
                          <strong>{(isBarcodeCaptureActive ? barcodeScanBuffer : inventoryItemForm.barcode) || "Waiting for barcode scan"}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="inventory-block inner">
                    <div className="inventory-block-head">
                      <h3>Custom Fields</h3>
                      <button className="ghost small" onClick={addInventoryFieldDraft}>+ Add Field</button>
                    </div>
                    {inventoryFieldDrafts.length === 0 ? (
                      <p className="helper-copy">Start with a text field, then add number, date, boolean, or textarea fields as needed.</p>
                    ) : (
                      <div className="inventory-dynamic-field-list">
                        {inventoryFieldDrafts.map((fieldDraft) => (
                          <div
                            key={fieldDraft.tempId}
                            className={`inventory-dynamic-field-row ${draggedInventoryFieldId === fieldDraft.tempId ? "dragging" : ""}`}
                            draggable
                            onDragStart={() => setDraggedInventoryFieldId(fieldDraft.tempId)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              moveInventoryFieldDraft(draggedInventoryFieldId, fieldDraft.tempId);
                              setDraggedInventoryFieldId("");
                            }}
                            onDragEnd={() => setDraggedInventoryFieldId("")}
                          >
                            <button className="ghost small inventory-drag-handle" title="Drag to reorder">⋮⋮</button>
                            <input
                              placeholder="Field label"
                              value={fieldDraft.label}
                              disabled={Boolean(fieldDraft.definitionId)}
                              onChange={(e) => updateInventoryFieldDraft(fieldDraft.tempId, { label: e.target.value })}
                            />
                            <select
                              value={fieldDraft.fieldType}
                              disabled={Boolean(fieldDraft.definitionId)}
                              onChange={(e) => updateInventoryFieldDraft(fieldDraft.tempId, { fieldType: e.target.value as InventoryFieldType })}
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="boolean">Boolean</option>
                              <option value="textarea">Textarea</option>
                            </select>
                            {renderInventoryFieldValueInput(fieldDraft)}
                            <button className="ghost small" disabled={Boolean(fieldDraft.definitionId)} onClick={() => removeInventoryFieldDraft(fieldDraft.tempId)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="button-row">
                    <button onClick={saveInventoryItem}>{editingInventoryItemId ? "Update Item" : "Save Item"}</button>
                    <button className="ghost" onClick={resetInventoryItemModal}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showInventoryCsvImportModal && inventoryCsvPreview && (
            <div className="modal-overlay" onClick={closeInventoryCsvImportModal}>
              <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>CSV Import Preview</h2>
                  <button className="modal-close ghost" title="Close (Esc)" onClick={closeInventoryCsvImportModal}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="inventory-csv-meta">
                    <div>
                      <strong>File:</strong> {inventoryCsvPreview.fileName}
                    </div>
                    <div>
                      <strong>Rows:</strong> {inventoryCsvPreview.rows.length}
                    </div>
                  </div>

                  <div className="inventory-block inner">
                    <div className="inventory-block-head">
                      <h3>Column Mapping</h3>
                      <span>Map each CSV column before import.</span>
                    </div>
                    <div className="inventory-csv-mapping-grid">
                      {inventoryCsvPreview.headers.map((header) => (
                        <div key={header} className="inventory-csv-mapping-row">
                          <strong>{header}</strong>
                          <select
                            value={inventoryCsvMapping[header] || "custom"}
                            onChange={(e) => setInventoryCsvMapping((currentMap) => ({
                              ...currentMap,
                              [header]: e.target.value as InventoryCsvMapping,
                            }))}
                          >
                            <option value="name">Name</option>
                            <option value="trackingMode">Tracking Mode</option>
                            <option value="quantity">Quantity</option>
                            <option value="barcode">Barcode</option>
                            <option value="notes">Notes</option>
                            <option value="custom">Custom Field</option>
                            <option value="ignore">Ignore</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="inventory-block inner">
                    <div className="inventory-csv-validation-summary">
                      {inventoryCsvRowValidations.some((rowValidation) => rowValidation.errors.length > 0) ? (
                        <span className="inventory-validation-bad">{inventoryCsvRowValidations.filter((rowValidation) => rowValidation.errors.length > 0).length} rows need attention before import.</span>
                      ) : (
                        <span className="inventory-validation-good">All preview rows are valid for import.</span>
                      )}
                    </div>
                    <div className="inventory-block-head">
                      <h3>Preview Rows</h3>
                      <span>Showing first 5 rows with validation.</span>
                    </div>
                    <div className="table-wrap inventory-csv-preview-table">
                      <table>
                        <thead>
                          <tr>
                            {inventoryCsvPreview.headers.map((header) => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryCsvPreview.rows.slice(0, 5).map((row, rowIndex) => (
                            <tr key={`preview-${rowIndex}`} className={inventoryCsvRowValidations[rowIndex]?.errors.length ? "inventory-csv-row-error" : ""}>
                              {inventoryCsvPreview.headers.map((header, headerIndex) => (
                                <td key={`${header}-${rowIndex}`}>{row[headerIndex] || "-"}</td>
                              ))}
                            </tr>
                          ))}
                          {inventoryCsvPreview.rows.slice(0, 5).map((_, rowIndex) => (
                            inventoryCsvRowValidations[rowIndex]?.errors.length ? (
                              <tr key={`preview-error-${rowIndex}`} className="inventory-csv-error-detail-row">
                                <td colSpan={inventoryCsvPreview.headers.length}>
                                  <strong>Row {inventoryCsvRowValidations[rowIndex].rowNumber}:</strong> {inventoryCsvRowValidations[rowIndex].errors.join(" ")}
                                </td>
                              </tr>
                            ) : null
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="button-row">
                    <button disabled={inventoryCsvRowValidations.some((rowValidation) => rowValidation.errors.length > 0)} onClick={() => void commitInventoryCsvImport()}>Import Items</button>
                    <button className="ghost" onClick={closeInventoryCsvImportModal}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {page === "admin" && (
        <section className="layout-grid">
          <article className="card span-4">
            <h2>Departments</h2>
            <div className="field-grid single">
              <input placeholder="Department name" value={departmentForm.name} onChange={(e) => setDepartmentForm((v) => ({ ...v, name: e.target.value }))} />
              <textarea placeholder="Description" value={departmentForm.description} onChange={(e) => setDepartmentForm((v) => ({ ...v, description: e.target.value }))} />
            </div>
            <button disabled={!can("department.manage")} onClick={createDepartment}>Create Department</button>
            <ul className="chips">
              {departments.map((d) => (<li key={d.id}>{d.name}</li>))}
            </ul>
          </article>

          <article className="card span-4">
            <h2>Roles + Policies</h2>
            <div className="field-grid single">
              <input placeholder="Role name" value={roleForm.name} onChange={(e) => setRoleForm((v) => ({ ...v, name: e.target.value }))} />
              <textarea placeholder="Role description" value={roleForm.description} onChange={(e) => setRoleForm((v) => ({ ...v, description: e.target.value }))} />
            </div>
            <button disabled={!can("role.manage")} onClick={createRole}>Create Role</button>

            <hr />

            <div className="field-grid single">
              <input placeholder="Policy key (example: supplier.create)" value={policyForm.key} onChange={(e) => setPolicyForm((v) => ({ ...v, key: e.target.value }))} />
              <input placeholder="Policy module" value={policyForm.module} onChange={(e) => setPolicyForm((v) => ({ ...v, module: e.target.value }))} />
              <textarea placeholder="Policy description" value={policyForm.description} onChange={(e) => setPolicyForm((v) => ({ ...v, description: e.target.value }))} />
            </div>
            <button disabled={!can("policy.manage")} onClick={createPolicy}>Create Policy</button>

            <div className="field-grid single">
              <select value={policyAssignment.roleId} onChange={(e) => setPolicyAssignment((v) => ({ ...v, roleId: e.target.value }))}>
                <option value="">Select role</option>
                {roles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
              <select value={policyAssignment.policyId} onChange={(e) => setPolicyAssignment((v) => ({ ...v, policyId: e.target.value }))}>
                <option value="">Select policy</option>
                {policies.map((p) => (<option key={p.id} value={p.id}>{p.key}</option>))}
              </select>
            </div>
            <button disabled={!can("role.policy.assign")} onClick={assignPolicyToRole}>Assign Policy To Role</button>
          </article>

          <article className="card span-4">
            <h2>Users</h2>
            <div className="field-grid single">
              <input placeholder="Email" value={adminUserForm.email} onChange={(e) => setAdminUserForm((v) => ({ ...v, email: e.target.value }))} />
              <input placeholder="First name" value={adminUserForm.firstName} onChange={(e) => setAdminUserForm((v) => ({ ...v, firstName: e.target.value }))} />
              <input placeholder="Last name" value={adminUserForm.lastName} onChange={(e) => setAdminUserForm((v) => ({ ...v, lastName: e.target.value }))} />
              <select value={adminUserForm.departmentId} onChange={(e) => setAdminUserForm((v) => ({ ...v, departmentId: e.target.value }))}>
                <option value="">No department</option>
                {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
              <label className="check-row">
                <input type="checkbox" checked={adminUserForm.isAdmin} onChange={(e) => setAdminUserForm((v) => ({ ...v, isAdmin: e.target.checked }))} />
                Make admin
              </label>
            </div>
            <button disabled={!can("user.manage")} onClick={createAppUserByAdmin}>Create User</button>

            <div className="field-grid single">
              <select value={roleAssignment.userId} onChange={(e) => setRoleAssignment((v) => ({ ...v, userId: e.target.value }))}>
                <option value="">Select user</option>
                {appUsers.map((u) => (<option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>))}
              </select>
              <select value={roleAssignment.roleId} onChange={(e) => setRoleAssignment((v) => ({ ...v, roleId: e.target.value }))}>
                <option value="">Select role</option>
                {roles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
            </div>
            <button disabled={!can("user.role.assign")} onClick={assignRoleToUser}>Assign Role To User</button>
          </article>
        </section>
      )}
    </main>
  );
}

export default withAuthenticator(App);
