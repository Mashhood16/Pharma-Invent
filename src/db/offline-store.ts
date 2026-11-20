// Production Multi-Tenant In-Memory & File-Persisted Data Store
// Provides complete multi-pharmacy isolation and Super Admin management

import fs from "fs";
import path from "path";
import { PharmacySettings, DEFAULT_SETTINGS } from "@/lib/settings-types";

export interface OfflinePharmacy {
  id: string;
  name: string;
  dslNumber: string;
  ntn?: string;
  ownerName: string;
  phone: string;
  address: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
}

export interface OfflineUser {
  id: string;
  pharmacyId: string | null; // null for SUPER_ADMIN
  username: string;
  passwordHash: string; // Plaintext or hashed for local validation
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "CASHIER";
  createdAt: string;
}

export interface OfflineMedicine {
  id: string;
  pharmacyId: string;
  brandName: string;
  genericFormula: string;
  category: string;
  barcode: string | null;
  reorderLevel: number;
  batches: OfflineBatch[];
}

export interface OfflineBatch {
  id: string;
  medicineId: string;
  pharmacyId: string;
  batchNumber: string;
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  expiryDate: string;
  boxesInStock: number;
  unitsPerBox: number;
  buyPricePerBox: number; // Buy / Box
  retailPricePerBox: number; // Sell / Box
  retailPricePerUnit: number; // Sell / Tab
}

export interface OfflineCustomer {
  id: string;
  pharmacyId: string;
  name: string;
  phone: string;
  pendingCredit: number;
  updatedAt: string;
}

export interface OfflineSale {
  id: string;
  pharmacyId: string;
  receiptNumber: string;
  userId: string;
  cashierName: string;
  customerId: string | null;
  customerName: string | null;
  totalAmount: number;
  totalProfit: number;
  paymentMethod: "CASH" | "CREDIT";
  createdAt: string;
  items: {
    brandName: string;
    batchNumber: string;
    quantityUnits: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export interface OfflineSupplier {
  id: string;
  pharmacyId: string;
  name: string;
  contactInfo: string;
  ledgerBalance: number;
}

export interface OfflinePurchase {
  id: string;
  pharmacyId: string;
  supplierId: string;
  supplier: { name: string };
  invoiceNumber: string;
  totalCost: number;
  amountPaid: number;
  createdAt: string;
  items: {
    id: string;
    boxesPurchased: number;
    buyPricePerBox: number;
    subtotal: number;
    batch: {
      batchNumber: string;
      medicine: { brandName: string };
    };
  }[];
}

export interface OfflineCustomerPayment {
  id: string;
  pharmacyId: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "ONLINE";
  notes?: string;
  createdAt: string;
}

export interface OfflineSupplierPayment {
  id: string;
  pharmacyId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "CHEQUE";
  notes?: string;
  createdAt: string;
}

const PRIMARY_FILE = path.join(process.cwd(), "pharmacies-data.json");
const TMP_FILE = path.join("/tmp", "pharmacies-data.json");

class OfflinePharmacyStore {
  pharmacies: OfflinePharmacy[] = [];
  users: OfflineUser[] = [];
  suppliers: OfflineSupplier[] = [];
  customers: OfflineCustomer[] = [];
  medicines: OfflineMedicine[] = [];
  sales: OfflineSale[] = [];
  purchases: OfflinePurchase[] = [];
  customerPayments: OfflineCustomerPayment[] = [];
  supplierPayments: OfflineSupplierPayment[] = [];
  pharmacySettings: Record<string, PharmacySettings> = {};

  constructor() {
    this.loadFromDisk();
    if (this.pharmacies.length === 0) {
      this.initDefaultSeed();
    }
    this.ensureDefaultUsers();
  }

  private ensureDefaultUsers() {
    if (!this.users.some((u) => u.username.toLowerCase() === "superadmin")) {
      this.users.unshift({
        id: "user-superadmin",
        pharmacyId: null,
        username: "superadmin",
        passwordHash: "superadmin123",
        name: "Master Super Admin (Platform Owner)",
        role: "SUPER_ADMIN",
        createdAt: new Date().toISOString(),
      });
    }

    if (!this.users.some((u) => u.username.toLowerCase() === "admin")) {
      this.users.push({
        id: "user-admin-default",
        pharmacyId: "pharm-default",
        username: "admin",
        passwordHash: "admin123",
        name: "Dr. Hamza Siddiqui (Head Pharmacist)",
        role: "ADMIN",
        createdAt: new Date().toISOString(),
      });
    }

    if (!this.users.some((u) => u.username.toLowerCase() === "cashier")) {
      this.users.push({
        id: "user-cashier-default",
        pharmacyId: "pharm-default",
        username: "cashier",
        passwordHash: "cashier123",
        name: "Ali Raza (Terminal Cashier)",
        role: "CASHIER",
        createdAt: new Date().toISOString(),
      });
    }
  }

  private saveToDisk() {
    const dump = {
      pharmacies: this.pharmacies,
      users: this.users,
      suppliers: this.suppliers,
      customers: this.customers,
      medicines: this.medicines,
      sales: this.sales,
      purchases: this.purchases,
      customerPayments: this.customerPayments,
      supplierPayments: this.supplierPayments,
      pharmacySettings: this.pharmacySettings,
    };
    const jsonStr = JSON.stringify(dump, null, 2);

    // Try saving to project root first
    let saved = false;
    try {
      fs.writeFileSync(PRIMARY_FILE, jsonStr, "utf-8");
      saved = true;
    } catch {
      // Root might be read-only on Vercel serverless
    }

    // On Vercel / serverless runtime, also persist to writable /tmp
    try {
      fs.writeFileSync(TMP_FILE, jsonStr, "utf-8");
      saved = true;
    } catch {
      // Ephemeral fallback
    }
  }

  private loadFromDisk() {
    try {
      // 1. Check writable /tmp first on serverless
      let raw: string | null = null;
      if (fs.existsSync(TMP_FILE)) {
        try {
          raw = fs.readFileSync(TMP_FILE, "utf-8");
        } catch {}
      }

      // 2. Fall back to bundled data file
      if (!raw && fs.existsSync(PRIMARY_FILE)) {
        try {
          raw = fs.readFileSync(PRIMARY_FILE, "utf-8");
        } catch {}
      }

      if (raw) {
        const dump = JSON.parse(raw);
        this.pharmacies = dump.pharmacies || [];
        this.users = dump.users || [];
        this.suppliers = dump.suppliers || [];
        this.customers = dump.customers || [];
        this.medicines = dump.medicines || [];
        this.sales = dump.sales || [];
        this.purchases = dump.purchases || [];
        this.customerPayments = dump.customerPayments || [];
        this.supplierPayments = dump.supplierPayments || [];
        this.pharmacySettings = dump.pharmacySettings || {};
      }
    } catch {
      // Fallback to default
    }
  }

  private initDefaultSeed() {
    // 1. Initial Default Pharmacy
    const defaultPharm: OfflinePharmacy = {
      id: "pharm-default",
      name: "Al-Shifa Community Pharmacy",
      dslNumber: "DSL-PK-2026-0811",
      ntn: "NTN-7819201-4",
      ownerName: "Dr. Hamza Siddiqui",
      phone: "+92 300 1234567",
      address: "Shop # 1, Main Market, Lahore, Pakistan",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.pharmacies.push(defaultPharm);

    // 2. Default Store Settings
    this.pharmacySettings["pharm-default"] = {
      ...DEFAULT_SETTINGS,
      pharmacyName: defaultPharm.name,
      drugSaleLicense: defaultPharm.dslNumber,
      ntnNumber: defaultPharm.ntn || "",
      phone: defaultPharm.phone,
      address: defaultPharm.address,
    };

    // 3. Super Admin User (Access to everything & pharmacy management)
    this.users.push({
      id: "user-superadmin",
      pharmacyId: null,
      username: "superadmin",
      passwordHash: "superadmin123",
      name: "Master Super Admin (Platform Owner)",
      role: "SUPER_ADMIN",
      createdAt: new Date().toISOString(),
    });

    // 4. Default Pharmacy Admin
    this.users.push({
      id: "user-admin-default",
      pharmacyId: "pharm-default",
      username: "admin",
      passwordHash: "admin123",
      name: "Dr. Hamza Siddiqui (Head Pharmacist)",
      role: "ADMIN",
      createdAt: new Date().toISOString(),
    });

    // 5. Default Pharmacy Cashier
    this.users.push({
      id: "user-cashier-default",
      pharmacyId: "pharm-default",
      username: "cashier",
      passwordHash: "cashier123",
      name: "Ali Raza (Terminal Cashier)",
      role: "CASHIER",
      createdAt: new Date().toISOString(),
    });

    this.saveToDisk();
  }

  // -------------------------------------------------------------
  // SUPER ADMIN PHARMACY MANAGEMENT METHODS
  // -------------------------------------------------------------

  getPharmaciesWithStats() {
    return this.pharmacies.map((pharm) => {
      const medCount = this.medicines.filter((m) => m.pharmacyId === pharm.id).length;
      const pharmSales = this.sales.filter((s) => s.pharmacyId === pharm.id);
      const totalRevenue = pharmSales.reduce((acc, s) => acc + s.totalAmount, 0);
      const custCount = this.customers.filter((c) => c.pharmacyId === pharm.id).length;
      const userCount = this.users.filter((u) => u.pharmacyId === pharm.id).length;

      return {
        ...pharm,
        totalMedicines: medCount,
        totalSalesCount: pharmSales.length,
        totalRevenue,
        totalCustomers: custCount,
        totalUsers: userCount,
      };
    });
  }

  getPharmacy(id: string): OfflinePharmacy | undefined {
    return this.pharmacies.find((p) => p.id === id);
  }

  createPharmacy(data: {
    name: string;
    dslNumber: string;
    ntn?: string;
    ownerName: string;
    phone: string;
    address: string;
    adminUsername: string;
    adminPassword: string;
  }): { pharmacy: OfflinePharmacy; adminUser: OfflineUser } {
    const cleanUsername = data.adminUsername.trim().toLowerCase();
    const existingUser = this.users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existingUser) {
      throw new Error(`Username "${cleanUsername}" is already taken.`);
    }

    const pharmId = `pharm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPharmacy: OfflinePharmacy = {
      id: pharmId,
      name: data.name.trim(),
      dslNumber: data.dslNumber.trim(),
      ntn: data.ntn?.trim() || "",
      ownerName: data.ownerName.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newAdmin: OfflineUser = {
      id: `user-${Date.now()}`,
      pharmacyId: pharmId,
      username: cleanUsername,
      passwordHash: data.adminPassword.trim(),
      name: `${data.ownerName.trim()} (Pharmacist)`,
      role: "ADMIN",
      createdAt: new Date().toISOString(),
    };

    // Default Settings for the new pharmacy
    this.pharmacySettings[pharmId] = {
      ...DEFAULT_SETTINGS,
      pharmacyName: newPharmacy.name,
      drugSaleLicense: newPharmacy.dslNumber,
      ntnNumber: newPharmacy.ntn || "",
      phone: newPharmacy.phone,
      address: newPharmacy.address,
    };

    this.pharmacies.unshift(newPharmacy);
    this.users.unshift(newAdmin);
    this.saveToDisk();

    return { pharmacy: newPharmacy, adminUser: newAdmin };
  }

  updatePharmacy(id: string, data: Partial<OfflinePharmacy>): OfflinePharmacy {
    const p = this.pharmacies.find((item) => item.id === id);
    if (!p) throw new Error("Pharmacy not found");

    Object.assign(p, data, { updatedAt: new Date().toISOString() });

    // Update settings if store identity changed
    if (this.pharmacySettings[id]) {
      if (data.name) this.pharmacySettings[id].pharmacyName = data.name;
      if (data.dslNumber) this.pharmacySettings[id].drugSaleLicense = data.dslNumber;
      if (data.phone) this.pharmacySettings[id].phone = data.phone;
      if (data.address) this.pharmacySettings[id].address = data.address;
    }

    this.saveToDisk();
    return p;
  }

  togglePharmacyStatus(id: string): OfflinePharmacy {
    const p = this.pharmacies.find((item) => item.id === id);
    if (!p) throw new Error("Pharmacy not found");
    p.status = p.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    p.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return p;
  }

  deletePharmacy(id: string): boolean {
    const index = this.pharmacies.findIndex((p) => p.id === id);
    if (index === -1) return false;

    this.pharmacies.splice(index, 1);
    this.users = this.users.filter((u) => u.pharmacyId !== id);
    this.medicines = this.medicines.filter((m) => m.pharmacyId !== id);
    this.suppliers = this.suppliers.filter((s) => s.pharmacyId !== id);
    this.customers = this.customers.filter((c) => c.pharmacyId !== id);
    this.sales = this.sales.filter((s) => s.pharmacyId !== id);
    this.purchases = this.purchases.filter((p) => p.pharmacyId !== id);
    this.customerPayments = this.customerPayments.filter((cp) => cp.pharmacyId !== id);
    this.supplierPayments = this.supplierPayments.filter((sp) => sp.pharmacyId !== id);
    delete this.pharmacySettings[id];

    this.saveToDisk();
    return true;
  }

  getGlobalPlatformStats() {
    const totalPharmacies = this.pharmacies.length;
    const activePharmacies = this.pharmacies.filter((p) => p.status === "ACTIVE").length;
    const totalMedicinesCataloged = this.medicines.length;
    const totalSalesVolume = this.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalOrders = this.sales.length;
    const totalCustomers = this.customers.length;

    return {
      totalPharmacies,
      activePharmacies,
      totalMedicinesCataloged,
      totalSalesVolume,
      totalOrders,
      totalCustomers,
    };
  }

  // -------------------------------------------------------------
  // PHARMACY-SCOPED TENANT METHODS
  // -------------------------------------------------------------

  getSettings(pharmacyId: string): PharmacySettings {
    if (!this.pharmacySettings[pharmacyId]) {
      const pharm = this.pharmacies.find((p) => p.id === pharmacyId);
      this.pharmacySettings[pharmacyId] = {
        ...DEFAULT_SETTINGS,
        pharmacyName: pharm?.name || DEFAULT_SETTINGS.pharmacyName,
        drugSaleLicense: pharm?.dslNumber || DEFAULT_SETTINGS.drugSaleLicense,
        phone: pharm?.phone || DEFAULT_SETTINGS.phone,
        address: pharm?.address || DEFAULT_SETTINGS.address,
      };
      this.saveToDisk();
    }
    return this.pharmacySettings[pharmacyId];
  }

  saveSettings(pharmacyId: string, settings: Partial<PharmacySettings>): PharmacySettings {
    const current = this.getSettings(pharmacyId);
    const updated = { ...current, ...settings };
    this.pharmacySettings[pharmacyId] = updated;

    // Keep pharmacy store name in sync
    const pharm = this.pharmacies.find((p) => p.id === pharmacyId);
    if (pharm && settings.pharmacyName) {
      pharm.name = settings.pharmacyName;
      pharm.updatedAt = new Date().toISOString();
    }

    this.saveToDisk();
    return updated;
  }

  // Search medicines strictly for a pharmacy
  searchMedicines(pharmacyId: string, query = "", barcode = "") {
    const meds = this.medicines.filter((m) => m.pharmacyId === pharmacyId);
    if (barcode) {
      return meds.filter((m) => m.barcode === barcode);
    }
    if (!query) return meds;
    const q = query.toLowerCase();
    return meds.filter(
      (m) =>
        m.brandName.toLowerCase().includes(q) ||
        m.genericFormula.toLowerCase().includes(q)
    );
  }

  getMedicines(pharmacyId: string) {
    return this.medicines.filter((m) => m.pharmacyId === pharmacyId);
  }

  // Add a new medicine for a specific pharmacy
  addMedicine(
    pharmacyId: string,
    data: {
      brandName: string;
      genericFormula: string;
      category: string;
      barcode?: string | null;
      reorderLevel?: number;
      initialBatch?: {
        batchNumber: string;
        supplierId: string;
        expiryDate: string;
        boxesInStock: number;
        unitsPerBox: number;
        buyPricePerBox: number;
        retailPricePerBox?: number;
        retailPricePerUnit: number;
      };
    }
  ): OfflineMedicine {
    const medId = `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const batches: OfflineBatch[] = [];

    if (data.initialBatch && data.initialBatch.batchNumber) {
      const sup = this.suppliers.find(
        (s) => s.id === data.initialBatch!.supplierId && s.pharmacyId === pharmacyId
      );
      const unitsPerBox = Number(data.initialBatch.unitsPerBox) || 100;
      let unitPrice = Number(data.initialBatch.retailPricePerUnit) || 0;
      let boxPrice = Number(data.initialBatch.retailPricePerBox) || 0;

      if (boxPrice > 0 && unitPrice === 0) {
        unitPrice = boxPrice / unitsPerBox;
      } else if (unitPrice > 0 && boxPrice === 0) {
        boxPrice = unitPrice * unitsPerBox;
      }

      batches.push({
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        medicineId: medId,
        pharmacyId,
        batchNumber: data.initialBatch.batchNumber.trim(),
        supplierId: data.initialBatch.supplierId || "",
        supplierName: sup ? sup.name : "Direct Delivery",
        supplierContact: sup ? sup.contactInfo : "",
        expiryDate: data.initialBatch.expiryDate,
        boxesInStock: Number(data.initialBatch.boxesInStock) || 0,
        unitsPerBox,
        buyPricePerBox: Number(data.initialBatch.buyPricePerBox) || 0,
        retailPricePerBox: boxPrice,
        retailPricePerUnit: unitPrice,
      });
    }

    const newMed: OfflineMedicine = {
      id: medId,
      pharmacyId,
      brandName: data.brandName.trim(),
      genericFormula: data.genericFormula.trim(),
      category: data.category?.trim() || "Tablets (Oral)",
      barcode: data.barcode?.trim() || null,
      reorderLevel: Number(data.reorderLevel) || 2,
      batches,
    };

    this.medicines.unshift(newMed);
    this.saveToDisk();
    return newMed;
  }

  deleteMedicine(pharmacyId: string, id: string): boolean {
    const initialLen = this.medicines.length;
    this.medicines = this.medicines.filter((m) => !(m.id === id && m.pharmacyId === pharmacyId));
    const deleted = this.medicines.length < initialLen;
    if (deleted) this.saveToDisk();
    return deleted;
  }

  // Stock Inflow / Purchases
  getPurchases(pharmacyId: string) {
    return this.purchases.filter((p) => p.pharmacyId === pharmacyId);
  }

  addPurchase(
    pharmacyId: string,
    data: {
      supplierId: string;
      invoiceNumber: string;
      totalCost: number;
      amountPaid: number;
      items: {
        medicineId: string;
        batchNumber: string;
        expiryDate: string;
        boxesPurchased: number;
        unitsPerBox: number;
        buyPricePerBox: number;
        retailPricePerBox?: number;
        retailPricePerUnit: number;
      }[];
    }
  ): OfflinePurchase {
    const sup = this.suppliers.find((s) => s.id === data.supplierId && s.pharmacyId === pharmacyId);
    const purchaseId = `purch-${Date.now()}`;
    const purchaseItemsList: any[] = [];

    for (const item of data.items) {
      const med = this.medicines.find((m) => m.id === item.medicineId && m.pharmacyId === pharmacyId);
      if (!med) continue;

      const subtotal = item.boxesPurchased * item.buyPricePerBox;
      const unitsPerBox = item.unitsPerBox || 100;
      let unitPrice = item.retailPricePerUnit || 0;
      let boxPrice = item.retailPricePerBox || 0;

      if (boxPrice > 0 && unitPrice === 0) {
        unitPrice = boxPrice / unitsPerBox;
      } else if (unitPrice > 0 && boxPrice === 0) {
        boxPrice = unitPrice * unitsPerBox;
      }

      let existingBatch = med.batches.find((b) => b.batchNumber === item.batchNumber.trim());
      if (existingBatch) {
        existingBatch.boxesInStock += item.boxesPurchased;
        existingBatch.buyPricePerBox = item.buyPricePerBox;
        existingBatch.retailPricePerBox = boxPrice;
        existingBatch.retailPricePerUnit = unitPrice;
      } else {
        existingBatch = {
          id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          medicineId: med.id,
          pharmacyId,
          batchNumber: item.batchNumber.trim(),
          supplierId: data.supplierId,
          supplierName: sup ? sup.name : "Direct Delivery",
          supplierContact: sup ? sup.contactInfo : "",
          expiryDate: item.expiryDate,
          boxesInStock: item.boxesPurchased,
          unitsPerBox,
          buyPricePerBox: item.buyPricePerBox,
          retailPricePerBox: boxPrice,
          retailPricePerUnit: unitPrice,
        };
        med.batches.push(existingBatch);
      }

      purchaseItemsList.push({
        id: `pi-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        boxesPurchased: item.boxesPurchased,
        buyPricePerBox: item.buyPricePerBox,
        subtotal,
        batch: {
          batchNumber: existingBatch.batchNumber,
          medicine: { brandName: med.brandName },
        },
      });
    }

    const newPurchase: OfflinePurchase = {
      id: purchaseId,
      pharmacyId,
      supplierId: data.supplierId,
      supplier: { name: sup ? sup.name : "Unknown Supplier" },
      invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      totalCost: data.totalCost,
      amountPaid: data.amountPaid,
      createdAt: new Date().toISOString(),
      items: purchaseItemsList,
    };

    this.purchases.unshift(newPurchase);

    if (sup) {
      const balanceOwed = data.totalCost - data.amountPaid;
      if (balanceOwed > 0) {
        sup.ledgerBalance += balanceOwed;
      }
    }

    this.saveToDisk();
    return newPurchase;
  }

  // Sales & Checkout
  getSales(pharmacyId: string) {
    return this.sales.filter((s) => s.pharmacyId === pharmacyId);
  }

  processSale(
    pharmacyId: string,
    items: { batchId: string; quantitySoldUnits: number; unitPrice: number }[],
    customerId: string | null,
    paymentMethod: "CASH" | "CREDIT",
    discount = 0,
    cashierName = "Terminal Cashier",
    userId = "u-active"
  ): OfflineSale {
    let subtotal = 0;
    let totalProfit = 0;
    const saleItemsList: any[] = [];
    const meds = this.medicines.filter((m) => m.pharmacyId === pharmacyId);

    for (const item of items) {
      let matchedBatch: OfflineBatch | null = null;
      let matchedMed: OfflineMedicine | null = null;

      for (const m of meds) {
        const b = m.batches.find((b) => b.id === item.batchId);
        if (b) {
          matchedBatch = b;
          matchedMed = m;
          break;
        }
      }

      if (!matchedBatch || !matchedMed) {
        throw new Error(`Batch ID ${item.batchId} not found in this pharmacy`);
      }

      const boxesNeeded = item.quantitySoldUnits / matchedBatch.unitsPerBox;
      if (boxesNeeded > matchedBatch.boxesInStock + 0.0001) {
        throw new Error(
          `Insufficient stock for ${matchedMed.brandName} (Batch ${matchedBatch.batchNumber}). Requested: ${item.quantitySoldUnits} units, but only ${matchedBatch.boxesInStock.toFixed(2)} boxes remain.`
        );
      }

      matchedBatch.boxesInStock = Math.max(0, matchedBatch.boxesInStock - boxesNeeded);

      const lineTotal = item.quantitySoldUnits * item.unitPrice;
      const unitCost = matchedBatch.buyPricePerBox / matchedBatch.unitsPerBox;
      const lineProfit = (item.unitPrice - unitCost) * item.quantitySoldUnits;

      subtotal += lineTotal;
      totalProfit += lineProfit;

      saleItemsList.push({
        batchId: matchedBatch.id,
        brandName: matchedMed.brandName,
        batchNumber: matchedBatch.batchNumber,
        quantityUnits: item.quantitySoldUnits,
        unitPrice: item.unitPrice,
        subtotal: lineTotal,
      });
    }

    const netAmount = Math.max(0, subtotal - discount);
    const netProfit = totalProfit - discount;
    const receiptNumber = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale: OfflineSale = {
      id: `sale-${Date.now()}`,
      pharmacyId,
      receiptNumber,
      userId,
      cashierName,
      customerId,
      customerName: customerId
        ? this.customers.find((c) => c.id === customerId && c.pharmacyId === pharmacyId)?.name || null
        : null,
      totalAmount: netAmount,
      totalProfit: netProfit,
      paymentMethod,
      createdAt: new Date().toISOString(),
      items: saleItemsList,
    };

    this.sales.unshift(newSale);

    if (paymentMethod === "CREDIT" && customerId) {
      const cust = this.customers.find((c) => c.id === customerId && c.pharmacyId === pharmacyId);
      if (cust) {
        cust.pendingCredit += netAmount;
        cust.updatedAt = new Date().toISOString();
      }
    }

    this.saveToDisk();
    return newSale;
  }

  deleteSale(pharmacyId: string, id: string): boolean {
    const saleIndex = this.sales.findIndex((s) => s.id === id && s.pharmacyId === pharmacyId);
    if (saleIndex === -1) return false;
    const sale = this.sales[saleIndex];
    const meds = this.medicines.filter((m) => m.pharmacyId === pharmacyId);

    // 1. Restore stock to batches
    for (const item of sale.items) {
      for (const m of meds) {
        const b = m.batches.find(
          (b) => b.batchNumber === item.batchNumber || (item as any).batchId === b.id
        );
        if (b) {
          const boxesToRestore = item.quantityUnits / b.unitsPerBox;
          b.boxesInStock += boxesToRestore;
          break;
        }
      }
    }

    // 2. Revert credit from customer if applicable
    if (sale.paymentMethod === "CREDIT" && sale.customerId) {
      const cust = this.customers.find((c) => c.id === sale.customerId && c.pharmacyId === pharmacyId);
      if (cust) {
        cust.pendingCredit = Math.max(0, cust.pendingCredit - sale.totalAmount);
        cust.updatedAt = new Date().toISOString();
      }
    }

    // 3. Remove sale
    this.sales.splice(saleIndex, 1);
    this.saveToDisk();
    return true;
  }

  // Return to Vendor (RTV)
  processRtv(pharmacyId: string, batchId: string) {
    const meds = this.medicines.filter((m) => m.pharmacyId === pharmacyId);
    for (const m of meds) {
      const b = m.batches.find((b) => b.id === batchId);
      if (b) {
        const returnedBoxes = b.boxesInStock;
        const claimValue = returnedBoxes * b.buyPricePerBox;
        b.boxesInStock = 0;

        const sup = this.suppliers.find((s) => s.id === b.supplierId && s.pharmacyId === pharmacyId);
        if (sup) {
          sup.ledgerBalance = Math.max(0, sup.ledgerBalance - claimValue);
        }

        this.saveToDisk();
        return {
          batchNumber: b.batchNumber,
          returnedBoxes,
          claimValue,
        };
      }
    }
    throw new Error("Batch not found for RTV processing");
  }

  // Customers & Khata
  getCustomers(pharmacyId: string) {
    return this.customers.filter((c) => c.pharmacyId === pharmacyId);
  }

  addCustomer(
    pharmacyId: string,
    data: { name: string; phone: string; pendingCredit?: number }
  ): OfflineCustomer {
    const newCust: OfflineCustomer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      pharmacyId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      pendingCredit: Number(data.pendingCredit) || 0,
      updatedAt: new Date().toISOString(),
    };
    this.customers.unshift(newCust);
    this.saveToDisk();
    return newCust;
  }

  recordCustomerPayment(
    pharmacyId: string,
    data: {
      customerId: string;
      amount: number;
      paymentMethod: "CASH" | "BANK" | "ONLINE";
      notes?: string;
    }
  ): OfflineCustomerPayment {
    const cust = this.customers.find((c) => c.id === data.customerId && c.pharmacyId === pharmacyId);
    if (!cust) throw new Error("Customer not found in this pharmacy");

    cust.pendingCredit = Math.max(0, cust.pendingCredit - data.amount);
    cust.updatedAt = new Date().toISOString();

    const payment: OfflineCustomerPayment = {
      id: `cp-${Date.now()}`,
      pharmacyId,
      customerId: cust.id,
      customerName: cust.name,
      amount: data.amount,
      paymentMethod: data.paymentMethod || "CASH",
      notes: data.notes || "",
      createdAt: new Date().toISOString(),
    };

    this.customerPayments.unshift(payment);
    this.saveToDisk();
    return payment;
  }

  getCustomerPayments(pharmacyId: string) {
    return this.customerPayments.filter((cp) => cp.pharmacyId === pharmacyId);
  }

  // Suppliers
  getSuppliers(pharmacyId: string) {
    return this.suppliers.filter((s) => s.pharmacyId === pharmacyId);
  }

  addSupplier(
    pharmacyId: string,
    data: { name: string; contactInfo?: string; ledgerBalance?: number }
  ): OfflineSupplier {
    const newSup: OfflineSupplier = {
      id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      pharmacyId,
      name: data.name.trim(),
      contactInfo: data.contactInfo?.trim() || "",
      ledgerBalance: Number(data.ledgerBalance) || 0,
    };
    this.suppliers.unshift(newSup);
    this.saveToDisk();
    return newSup;
  }

  recordSupplierPayment(
    pharmacyId: string,
    data: {
      supplierId: string;
      amount: number;
      paymentMethod: "CASH" | "BANK" | "CHEQUE";
      notes?: string;
    }
  ): OfflineSupplierPayment {
    const sup = this.suppliers.find((s) => s.id === data.supplierId && s.pharmacyId === pharmacyId);
    if (!sup) throw new Error("Supplier not found in this pharmacy");

    sup.ledgerBalance = Math.max(0, sup.ledgerBalance - data.amount);

    const payment: OfflineSupplierPayment = {
      id: `sp-${Date.now()}`,
      pharmacyId,
      supplierId: sup.id,
      supplierName: sup.name,
      amount: data.amount,
      paymentMethod: data.paymentMethod || "CASH",
      notes: data.notes || "",
      createdAt: new Date().toISOString(),
    };

    this.supplierPayments.unshift(payment);
    this.saveToDisk();
    return payment;
  }

  getSupplierPayments(pharmacyId: string) {
    return this.supplierPayments.filter((sp) => sp.pharmacyId === pharmacyId);
  }

  // Financial Analytics & Z-Report
  getFinancialMetrics(pharmacyId: string) {
    const pharmSales = this.sales.filter((s) => s.pharmacyId === pharmacyId);
    const now = new Date();

    const todaySales = pharmSales.filter((s) => {
      const d = new Date(s.createdAt);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });

    const monthSales = pharmSales.filter((s) => {
      const d = new Date(s.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const dailyTotal = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const dailyProfit = todaySales.reduce((sum, s) => sum + s.totalProfit, 0);
    const monthlyTotal = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthlyProfit = monthSales.reduce((sum, s) => sum + s.totalProfit, 0);
    const yearlyTotal = pharmSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const yearlyProfit = pharmSales.reduce((sum, s) => sum + s.totalProfit, 0);

    return {
      metrics: {
        daily: { sales: dailyTotal, profit: dailyProfit, orders: todaySales.length },
        monthly: { sales: monthlyTotal, profit: monthlyProfit, orders: monthSales.length },
        yearly: { sales: yearlyTotal, profit: yearlyProfit, orders: pharmSales.length },
      },
      recentSales: pharmSales,
    };
  }

  getDayEndClosing(pharmacyId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const isSameDay = (dStr: string) => {
      const d = new Date(dStr);
      return (
        d.getDate() === targetDate.getDate() &&
        d.getMonth() === targetDate.getMonth() &&
        d.getFullYear() === targetDate.getFullYear()
      );
    };

    const daySales = this.sales.filter((s) => s.pharmacyId === pharmacyId && isSameDay(s.createdAt));
    const cashSales = daySales
      .filter((s) => s.paymentMethod === "CASH")
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const creditSales = daySales
      .filter((s) => s.paymentMethod === "CREDIT")
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = daySales.reduce((sum, s) => sum + s.totalProfit, 0);

    const dayCustomerPayments = this.customerPayments.filter(
      (p) => p.pharmacyId === pharmacyId && isSameDay(p.createdAt)
    );
    const khataCashCollected = dayCustomerPayments
      .filter((p) => p.paymentMethod === "CASH")
      .reduce((sum, p) => sum + p.amount, 0);

    const daySupplierPayments = this.supplierPayments.filter(
      (p) => p.pharmacyId === pharmacyId && isSameDay(p.createdAt)
    );
    const supplierCashPaid = daySupplierPayments
      .filter((p) => p.paymentMethod === "CASH")
      .reduce((sum, p) => sum + p.amount, 0);

    const netExpectedDrawerCash = cashSales + khataCashCollected - supplierCashPaid;

    return {
      date: targetDate.toISOString().split("T")[0],
      totalOrders: daySales.length,
      cashSales,
      creditSales,
      totalSales: cashSales + creditSales,
      totalProfit,
      khataCashCollected,
      supplierCashPaid,
      netExpectedDrawerCash,
      customerPaymentsList: dayCustomerPayments,
      supplierPaymentsList: daySupplierPayments,
      recentSalesList: daySales,
    };
  }
}

export const offlineStore = new OfflinePharmacyStore();
