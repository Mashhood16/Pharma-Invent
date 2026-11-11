import { pgTable, uuid, text, varchar, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["ADMIN", "CASHIER"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "CREDIT"]);

// 1. Users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  role: roleEnum("role").default("CASHIER").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Medicines
export const medicines = pgTable("medicines", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandName: varchar("brand_name", { length: 255 }).notNull(),
  genericFormula: varchar("generic_formula", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("General"),
  barcode: varchar("barcode", { length: 100 }).unique(),
  reorderLevel: integer("reorder_level").notNull().default(2),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Suppliers
export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactInfo: text("contact_info"),
  ledgerBalance: numeric("ledger_balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. Batches (Crucial for Expiry, Stock, and Profit Calculations)
// Note: boxes_in_stock is decimal(10, 4) to allow fractional box tracking when loose units are sold
export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  medicineId: uuid("medicine_id")
    .notNull()
    .references(() => medicines.id, { onDelete: "cascade" }),
  batchNumber: varchar("batch_number", { length: 100 }).notNull(),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "restrict" }),
  expiryDate: timestamp("expiry_date").notNull(),
  boxesInStock: numeric("boxes_in_stock", { precision: 12, scale: 4 }).notNull().default("0"),
  unitsPerBox: integer("units_per_box").notNull().default(100), // e.g. 100 tablets/box
  buyPricePerBox: numeric("buy_price_per_box", { precision: 12, scale: 2 }).notNull(),
  retailPricePerBox: numeric("retail_price_per_box", { precision: 12, scale: 2 }),
  retailPricePerUnit: numeric("retail_price_per_unit", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. Customers (Khata / Credit Ledger)
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  pendingCredit: numeric("pending_credit", { precision: 12, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Sales
export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  receiptNumber: varchar("receipt_number", { length: 100 }).notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  customerId: uuid("customer_id")
    .references(() => customers.id, { onDelete: "set null" }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  totalProfit: numeric("total_profit", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("CASH"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. SaleItems
export const saleItems = pgTable("sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "restrict" }),
  quantitySoldUnits: integer("quantity_sold_units").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  profitMargin: numeric("profit_margin", { precision: 12, scale: 2 }).notNull(),
});

// 8. Purchases (Stock In / Inflow)
export const purchases = pgTable("purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "restrict" }),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. PurchaseItems (Detailed Inflow)
export const purchaseItems = pgTable("purchase_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  purchaseId: uuid("purchase_id")
    .notNull()
    .references(() => purchases.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "restrict" }),
  boxesPurchased: numeric("boxes_purchased", { precision: 12, scale: 2 }).notNull(),
  buyPricePerBox: numeric("buy_price_per_box", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// ---------------------- RELATIONS ----------------------

export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
}));

export const medicinesRelations = relations(medicines, ({ many }) => ({
  batches: many(batches),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  batches: many(batches),
  purchases: many(purchases),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  medicine: one(medicines, {
    fields: [batches.medicineId],
    references: [medicines.id],
  }),
  supplier: one(suppliers, {
    fields: [batches.supplierId],
    references: [suppliers.id],
  }),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  batch: one(batches, {
    fields: [saleItems.batchId],
    references: [batches.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  batch: one(batches, {
    fields: [purchaseItems.batchId],
    references: [batches.id],
  }),
}));

// TypeScript Type Inference Exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Medicine = typeof medicines.$inferSelect;
export type NewMedicine = typeof medicines.$inferInsert;

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;

export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;

export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type NewPurchaseItem = typeof purchaseItems.$inferInsert;
