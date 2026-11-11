// Production In-Memory Data Store (Zero Dummy Data)
// Maintains state for offline/standalone execution until PostgreSQL credentials are provided.

export interface OfflineMedicine {
  id: string;
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
  name: string;
  phone: string;
  pendingCredit: number;
  updatedAt: string;
}

export interface OfflineSale {
  id: string;
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
  name: string;
  contactInfo: string;
  ledgerBalance: number;
}

export interface OfflinePurchase {
  id: string;
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
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "ONLINE";
  notes?: string;
  createdAt: string;
}

export interface OfflineSupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "CHEQUE";
  notes?: string;
  createdAt: string;
}

class OfflinePharmacyStore {
  // Empty data arrays - No dummy data
  suppliers: OfflineSupplier[] = [];
  customers: OfflineCustomer[] = [];
  medicines: OfflineMedicine[] = [];
  sales: OfflineSale[] = [];
  purchases: OfflinePurchase[] = [];
  customerPayments: OfflineCustomerPayment[] = [];
  supplierPayments: OfflineSupplierPayment[] = [];

  // Search medicines
  searchMedicines(query = "", barcode = "") {
    if (barcode) {
      return this.medicines.filter((m) => m.barcode === barcode);
    }
    if (!query) return this.medicines;
    const q = query.toLowerCase();
    return this.medicines.filter(
      (m) =>
        m.brandName.toLowerCase().includes(q) ||
        m.genericFormula.toLowerCase().includes(q)
    );
  }

  // Add a new medicine with Buy/Box, Sell/Box, and Sell/Tab
  addMedicine(data: {
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
  }): OfflineMedicine {
    const medId = `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const batches: OfflineBatch[] = [];

    if (data.initialBatch && data.initialBatch.batchNumber) {
      const sup = this.suppliers.find((s) => s.id === data.initialBatch!.supplierId);
      const unitsPerBox = Number(data.initialBatch.unitsPerBox) || 100;
      let unitPrice = Number(data.initialBatch.retailPricePerUnit) || 0;
      let boxPrice = Number(data.initialBatch.retailPricePerBox) || 0;

      // If user provided Sell/Box but not Sell/Tab, compute Sell/Tab
      if (boxPrice > 0 && unitPrice === 0) {
        unitPrice = boxPrice / unitsPerBox;
      } else if (unitPrice > 0 && boxPrice === 0) {
        boxPrice = unitPrice * unitsPerBox;
      }

      batches.push({
        id: `batch-${Date.now()}`,
        medicineId: medId,
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
      brandName: data.brandName.trim(),
      genericFormula: data.genericFormula.trim(),
      category: data.category?.trim() || "Tablets (Oral)",
      barcode: data.barcode?.trim() || null,
      reorderLevel: Number(data.reorderLevel) || 2,
      batches,
    };

    this.medicines.unshift(newMed);
    return newMed;
  }

  // Delete a medicine and its associated batches
  deleteMedicine(id: string): boolean {
    const initialLen = this.medicines.length;
    this.medicines = this.medicines.filter((m) => m.id !== id);
    return this.medicines.length < initialLen;
  }

  // Record a stock purchase (Inflow)
  addPurchase(data: {
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
  }): OfflinePurchase {
    const sup = this.suppliers.find((s) => s.id === data.supplierId);
    const purchaseId = `purch-${Date.now()}`;
    const purchaseItemsList: any[] = [];

    for (const item of data.items) {
      const med = this.medicines.find((m) => m.id === item.medicineId);
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

    return newPurchase;
  }

  // Process checkout with strict inventory validation
  processSale(
    items: { batchId: string; quantitySoldUnits: number; unitPrice: number }[],
    customerId: string | null,
    paymentMethod: "CASH" | "CREDIT",
    discount = 0
  ): OfflineSale {
    let subtotal = 0;
    let totalProfit = 0;
    const saleItemsList: any[] = [];

    for (const item of items) {
      let matchedBatch: OfflineBatch | null = null;
      let matchedMed: OfflineMedicine | null = null;

      for (const m of this.medicines) {
        const b = m.batches.find((b) => b.id === item.batchId);
        if (b) {
          matchedBatch = b;
          matchedMed = m;
          break;
        }
      }

      if (!matchedBatch || !matchedMed) {
        throw new Error(`Batch ID ${item.batchId} not found in inventory`);
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
      receiptNumber,
      userId: "u-active",
      cashierName: "Terminal Cashier",
      customerId,
      customerName: customerId ? this.customers.find((c) => c.id === customerId)?.name || null : null,
      totalAmount: netAmount,
      totalProfit: netProfit,
      paymentMethod,
      createdAt: new Date().toISOString(),
      items: saleItemsList,
    };

    this.sales.unshift(newSale);

    if (paymentMethod === "CREDIT" && customerId) {
      const cust = this.customers.find((c) => c.id === customerId);
      if (cust) {
        cust.pendingCredit += netAmount;
        cust.updatedAt = new Date().toISOString();
      }
    }

    return newSale;
  }

  // Delete / void a sale and restore inventory stock & customer balance
  deleteSale(id: string): boolean {
    const saleIndex = this.sales.findIndex((s) => s.id === id);
    if (saleIndex === -1) return false;
    const sale = this.sales[saleIndex];

    // 1. Restore stock to batches
    for (const item of sale.items) {
      for (const m of this.medicines) {
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
      const cust = this.customers.find((c) => c.id === sale.customerId);
      if (cust) {
        cust.pendingCredit = Math.max(0, cust.pendingCredit - sale.totalAmount);
        cust.updatedAt = new Date().toISOString();
      }
    }

    // 3. Remove sale
    this.sales.splice(saleIndex, 1);
    return true;
  }

  // Return to Vendor (RTV)
  processRtv(batchId: string) {
    for (const m of this.medicines) {
      const b = m.batches.find((b) => b.id === batchId);
      if (b) {
        const returnedBoxes = b.boxesInStock;
        const claimValue = returnedBoxes * b.buyPricePerBox;
        b.boxesInStock = 0;

        const sup = this.suppliers.find((s) => s.id === b.supplierId);
        if (sup) {
          sup.ledgerBalance = Math.max(0, sup.ledgerBalance - claimValue);
        }

        return {
          batchNumber: b.batchNumber,
          returnedBoxes,
          claimValue,
        };
      }
    }
    throw new Error("Batch not found for RTV processing");
  }

  // Receive cash/payment from customer towards their Khata debt
  recordCustomerPayment(data: {
    customerId: string;
    amount: number;
    paymentMethod: "CASH" | "BANK" | "ONLINE";
    notes?: string;
  }): OfflineCustomerPayment {
    const cust = this.customers.find((c) => c.id === data.customerId);
    if (!cust) throw new Error("Customer not found");

    cust.pendingCredit = Math.max(0, cust.pendingCredit - data.amount);
    cust.updatedAt = new Date().toISOString();

    const payment: OfflineCustomerPayment = {
      id: `cp-${Date.now()}`,
      customerId: cust.id,
      customerName: cust.name,
      amount: data.amount,
      paymentMethod: data.paymentMethod || "CASH",
      notes: data.notes || "",
      createdAt: new Date().toISOString(),
    };

    this.customerPayments.unshift(payment);
    return payment;
  }

  // Record payout to medicine supplier/distributor
  recordSupplierPayment(data: {
    supplierId: string;
    amount: number;
    paymentMethod: "CASH" | "BANK" | "CHEQUE";
    notes?: string;
  }): OfflineSupplierPayment {
    const sup = this.suppliers.find((s) => s.id === data.supplierId);
    if (!sup) throw new Error("Supplier not found");

    sup.ledgerBalance = Math.max(0, sup.ledgerBalance - data.amount);

    const payment: OfflineSupplierPayment = {
      id: `sp-${Date.now()}`,
      supplierId: sup.id,
      supplierName: sup.name,
      amount: data.amount,
      paymentMethod: data.paymentMethod || "CASH",
      notes: data.notes || "",
      createdAt: new Date().toISOString(),
    };

    this.supplierPayments.unshift(payment);
    return payment;
  }

  // Compute Day-End Closing Cash Register Reconciliation (Z-Report)
  getDayEndClosing(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const isSameDay = (dStr: string) => {
      const d = new Date(dStr);
      return (
        d.getDate() === targetDate.getDate() &&
        d.getMonth() === targetDate.getMonth() &&
        d.getFullYear() === targetDate.getFullYear()
      );
    };

    const daySales = this.sales.filter((s) => isSameDay(s.createdAt));
    const cashSales = daySales
      .filter((s) => s.paymentMethod === "CASH")
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const creditSales = daySales
      .filter((s) => s.paymentMethod === "CREDIT")
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = daySales.reduce((sum, s) => sum + s.totalProfit, 0);

    const dayCustomerPayments = this.customerPayments.filter((p) => isSameDay(p.createdAt));
    const khataCashCollected = dayCustomerPayments
      .filter((p) => p.paymentMethod === "CASH")
      .reduce((sum, p) => sum + p.amount, 0);

    const daySupplierPayments = this.supplierPayments.filter((p) => isSameDay(p.createdAt));
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
