import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Inventory: a
    .model({
      sku: a.string().required(),
      name: a.string().required(),
      quantity: a.float().required(),
      unit: a.string().default("pcs"),
      location: a.string(),
      unitCost: a.float().default(0),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  InventoryCategory: a
    .model({
      name: a.string().required(),
      description: a.string(),
      parentCategoryId: a.id(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  InventoryFieldDefinition: a
    .model({
      categoryId: a.id().required(),
      label: a.string().required(),
      fieldType: a.string().required(),
      position: a.integer().default(0),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  InventoryItem: a
    .model({
      categoryId: a.id().required(),
      name: a.string().required(),
      trackingMode: a.string().required(),
      quantity: a.float(),
      barcode: a.string(),
      notes: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  InventoryItemFieldValue: a
    .model({
      itemId: a.id().required(),
      fieldDefinitionId: a.id().required(),
      value: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  Supplier: a
    .model({
      firstName: a.string().required(),
      lastName: a.string().required(),
      phone: a.string(),
      email: a.string(),
      address: a.string(),
      notes: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  AppUser: a
    .model({
      email: a.string().required(),
      firstName: a.string().required(),
      lastName: a.string().required(),
      cognitoSub: a.string(),
      departmentId: a.id(),
      isAdmin: a.boolean().default(false),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  Department: a
    .model({
      name: a.string().required(),
      description: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  Role: a
    .model({
      name: a.string().required(),
      description: a.string(),
      isSystem: a.boolean().default(false),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  Policy: a
    .model({
      key: a.string().required(),
      module: a.string().required(),
      description: a.string(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  RolePolicy: a
    .model({
      roleId: a.id().required(),
      policyId: a.id().required(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  UserRole: a
    .model({
      userId: a.id().required(),
      roleId: a.id().required(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [allow.authenticated()]),

  SupplierEmailLog: a
    .model({
      supplierId: a.id().required(),
      subject: a.string().required(),
      htmlContent: a.string().required(),
      sentByUserId: a.id(),
      sentAt: a.datetime().required(),
      status: a.string().default("DRAFT"),
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
