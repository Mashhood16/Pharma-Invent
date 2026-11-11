import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/pharma_invent";

async function runSeed() {
  console.log("🌱 Connecting to database for seeding...");
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log("🧹 Clearing old data (in reverse dependency order)...");
    await db.delete(schema.purchaseItems).execute().catch(() => {});
    await db.delete(schema.purchases).execute().catch(() => {});
    await db.delete(schema.saleItems).execute().catch(() => {});
    await db.delete(schema.sales).execute().catch(() => {});
    await db.delete(schema.batches).execute().catch(() => {});
    await db.delete(schema.customers).execute().catch(() => {});
    await db.delete(schema.medicines).execute().catch(() => {});
    await db.delete(schema.suppliers).execute().catch(() => {});
    await db.delete(schema.users).execute().catch(() => {});

    console.log("👤 Creating Admin and Cashier users...");
    const adminHash = await bcrypt.hash("admin123", 10);
    const cashierHash = await bcrypt.hash("cashier123", 10);

    const [adminUser] = await db
      .insert(schema.users)
      .values({
        name: "Dr. Hamza Siddiqui (Head Pharmacist)",
        username: "admin",
        role: "ADMIN",
        passwordHash: adminHash,
      })
      .returning();

    const [cashierUser] = await db
      .insert(schema.users)
      .values({
        name: "Ali Raza (Terminal Cashier)",
        username: "cashier",
        role: "CASHIER",
        passwordHash: cashierHash,
      })
      .returning();

    console.log("🏢 Seeding Suppliers...");
    const insertedSuppliers = await db
      .insert(schema.suppliers)
      .values([
        {
          name: "GSK Healthcare Distribution",
          contactInfo: "Phone: +1 800-475-2345 | Email: supply@gskdist.com",
          ledgerBalance: "1250.00",
        },
        {
          name: "Abbott Laboratories Supply",
          contactInfo: "Phone: +1 800-222-6880 | Email: orders@abbottpharma.com",
          ledgerBalance: "480.00",
        },
        {
          name: "Pfizer Regional Depot",
          contactInfo: "Phone: +1 800-734-9371 | Email: logistics@pfizerdist.com",
          ledgerBalance: "0.00",
        },
        {
          name: "Searle Pharmaceuticals",
          contactInfo: "Phone: +1 800-555-9123 | Email: orders@searle.com",
          ledgerBalance: "3200.50",
        },
      ])
      .returning();

    const gsk = insertedSuppliers[0];
    const abbott = insertedSuppliers[1];
    const pfizer = insertedSuppliers[2];
    const searle = insertedSuppliers[3];

    console.log("💊 Seeding Medicines & Generic Formula mappings...");
    const insertedMedicines = await db
      .insert(schema.medicines)
      .values([
        {
          brandName: "Panadol 500mg",
          genericFormula: "Paracetamol",
          category: "Analgesic / Antipyretic",
          barcode: "8901234567890",
          reorderLevel: 2,
        },
        {
          brandName: "Calpol 250mg Suspension",
          genericFormula: "Paracetamol",
          category: "Pediatric Analgesic",
          barcode: "8901234567891",
          reorderLevel: 2,
        },
        {
          brandName: "Disprol 500mg",
          genericFormula: "Paracetamol",
          category: "Analgesic",
          barcode: "8901234567892",
          reorderLevel: 2,
        },
        {
          brandName: "Augmentin 625mg",
          genericFormula: "Amoxicillin + Clavulanic Acid",
          category: "Broad Spectrum Antibiotic",
          barcode: "8901234567893",
          reorderLevel: 2,
        },
        {
          brandName: "Amoxil 500mg",
          genericFormula: "Amoxicillin",
          category: "Antibiotic",
          barcode: "8901234567894",
          reorderLevel: 2,
        },
        {
          brandName: "Brufen 400mg",
          genericFormula: "Ibuprofen",
          category: "NSAID Anti-inflammatory",
          barcode: "8901234567895",
          reorderLevel: 2,
        },
        {
          brandName: "Arinac Forte",
          genericFormula: "Ibuprofen + Pseudoephedrine",
          category: "Cold & Sinus Relief",
          barcode: "8901234567896",
          reorderLevel: 2,
        },
        {
          brandName: "Risek 20mg",
          genericFormula: "Omeprazole",
          category: "Proton Pump Inhibitor (Gastro)",
          barcode: "8901234567897",
          reorderLevel: 2,
        },
        {
          brandName: "Nexum 40mg",
          genericFormula: "Esomeprazole",
          category: "Proton Pump Inhibitor (Gastro)",
          barcode: "8901234567898",
          reorderLevel: 2,
        },
        {
          brandName: "Loprin 75mg",
          genericFormula: "Aspirin",
          category: "Cardiovascular Antiplatelet",
          barcode: "8901234567899",
          reorderLevel: 2,
        },
        {
          brandName: "Glucophage 500mg",
          genericFormula: "Metformin HCl",
          category: "Antidiabetic",
          barcode: "8901234567810",
          reorderLevel: 2,
        },
      ])
      .returning();

    console.log("📦 Seeding Batches (including Low Stock and Expired for RTV)...");
    const today = new Date();
    const expiredDate1 = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago
    const expiredDate2 = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const futureDate1 = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months ahead
    const futureDate2 = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead
    const nearExpiry = new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000); // 25 days ahead

    const medMap: Record<string, typeof insertedMedicines[0]> = {};
    insertedMedicines.forEach((m) => {
      medMap[m.brandName] = m;
    });

    const insertedBatches = await db
      .insert(schema.batches)
      .values([
        // Panadol 500mg - Healthy stock
        {
          medicineId: medMap["Panadol 500mg"].id,
          batchNumber: "B-PAN-2026A",
          supplierId: gsk.id,
          expiryDate: futureDate2,
          boxesInStock: "25.0000",
          unitsPerBox: 200, // 200 tablets per box
          buyPricePerBox: "18.00",
          retailPricePerUnit: "0.15", // total retail per box = $30.00
        },
        // Panadol 500mg - Low Stock (1.5 boxes) -> TRIGGERS RED ALERT!
        {
          medicineId: medMap["Panadol 500mg"].id,
          batchNumber: "B-PAN-OLD",
          supplierId: gsk.id,
          expiryDate: nearExpiry,
          boxesInStock: "1.5000",
          unitsPerBox: 200,
          buyPricePerBox: "17.50",
          retailPricePerUnit: "0.15",
        },
        // Calpol 250mg Suspension - Normal stock
        {
          medicineId: medMap["Calpol 250mg Suspension"].id,
          batchNumber: "B-CAL-991",
          supplierId: gsk.id,
          expiryDate: futureDate1,
          boxesInStock: "12.0000",
          unitsPerBox: 1, // 1 bottle per box
          buyPricePerBox: "3.20",
          retailPricePerUnit: "4.50",
        },
        // Augmentin 625mg - Low Stock (2.0 boxes) -> TRIGGERS RED ALERT!
        {
          medicineId: medMap["Augmentin 625mg"].id,
          batchNumber: "B-AUG-702",
          supplierId: gsk.id,
          expiryDate: futureDate1,
          boxesInStock: "2.0000",
          unitsPerBox: 14, // 14 tablets per box
          buyPricePerBox: "12.00",
          retailPricePerUnit: "1.20", // total retail per box = $16.80
        },
        // Amoxil 500mg - Expired batch (for Return to Vendor / Expiry Dashboard)
        {
          medicineId: medMap["Amoxil 500mg"].id,
          batchNumber: "B-AMX-EXP1",
          supplierId: abbott.id,
          expiryDate: expiredDate1,
          boxesInStock: "5.0000", // 5 expired boxes in stock
          unitsPerBox: 100,
          buyPricePerBox: "15.00",
          retailPricePerUnit: "0.25",
        },
        // Brufen 400mg - Healthy stock
        {
          medicineId: medMap["Brufen 400mg"].id,
          batchNumber: "B-BRU-440",
          supplierId: abbott.id,
          expiryDate: futureDate2,
          boxesInStock: "18.0000",
          unitsPerBox: 100,
          buyPricePerBox: "9.00",
          retailPricePerUnit: "0.14",
        },
        // Arinac Forte - Expired batch (for Expiry Dashboard)
        {
          medicineId: medMap["Arinac Forte"].id,
          batchNumber: "B-ARN-EXP2",
          supplierId: abbott.id,
          expiryDate: expiredDate2,
          boxesInStock: "3.0000", // 3 expired boxes in stock
          unitsPerBox: 100,
          buyPricePerBox: "11.00",
          retailPricePerUnit: "0.18",
        },
        // Risek 20mg - Healthy stock
        {
          medicineId: medMap["Risek 20mg"].id,
          batchNumber: "B-RSK-108",
          supplierId: searle.id,
          expiryDate: futureDate2,
          boxesInStock: "30.0000",
          unitsPerBox: 14,
          buyPricePerBox: "8.50",
          retailPricePerUnit: "0.85",
        },
        // Nexum 40mg - Low Stock (1.0 box) -> TRIGGERS RED ALERT!
        {
          medicineId: medMap["Nexum 40mg"].id,
          batchNumber: "B-NEX-019",
          supplierId: searle.id,
          expiryDate: futureDate1,
          boxesInStock: "1.0000",
          unitsPerBox: 14,
          buyPricePerBox: "10.00",
          retailPricePerUnit: "1.10",
        },
        // Loprin 75mg - Healthy stock
        {
          medicineId: medMap["Loprin 75mg"].id,
          batchNumber: "B-LOP-881",
          supplierId: pfizer.id,
          expiryDate: futureDate2,
          boxesInStock: "45.0000",
          unitsPerBox: 30,
          buyPricePerBox: "2.50",
          retailPricePerUnit: "0.15",
        },
        // Glucophage 500mg - Healthy stock
        {
          medicineId: medMap["Glucophage 500mg"].id,
          batchNumber: "B-GLU-512",
          supplierId: pfizer.id,
          expiryDate: futureDate2,
          boxesInStock: "20.0000",
          unitsPerBox: 50,
          buyPricePerBox: "6.00",
          retailPricePerUnit: "0.20",
        },
      ])
      .returning();

    console.log("👥 Seeding Customers with Khata (Credit)...");
    const insertedCustomers = await db
      .insert(schema.customers)
      .values([
        {
          name: "Muhammad Tariq (Regular Patient)",
          phone: "+1 555-010-9921",
          pendingCredit: "45.50",
        },
        {
          name: "Zainab Bibi",
          phone: "+1 555-014-8832",
          pendingCredit: "120.00",
        },
        {
          name: "Dr. Kamran Clinic Account",
          phone: "+1 555-019-3341",
          pendingCredit: "350.00",
        },
        {
          name: "Walk-in Cash Customer",
          phone: "000-000-0000",
          pendingCredit: "0.00",
        },
      ])
      .returning();

    console.log("💰 Seeding Past Sales for Financial Metrics (Daily, Monthly, Yearly)...");
    const panadolBatch = insertedBatches[0];
    const brufenBatch = insertedBatches[5];
    const risekBatch = insertedBatches[7];

    // 1. Today's sales
    const sale1 = await db
      .insert(schema.sales)
      .values({
        receiptNumber: "REC-20261110-001",
        userId: cashierUser.id,
        customerId: insertedCustomers[0].id,
        totalAmount: "45.00",
        totalProfit: "18.00",
        paymentMethod: "CASH",
        createdAt: today,
      })
      .returning();

    await db.insert(schema.saleItems).values([
      {
        saleId: sale1[0].id,
        batchId: panadolBatch.id,
        quantitySoldUnits: 100, // 100 loose tablets
        unitPrice: "0.15",
        subtotal: "15.00",
        profitMargin: "6.00", // (0.15 - 0.09) * 100
      },
      {
        saleId: sale1[0].id,
        batchId: risekBatch.id,
        quantitySoldUnits: 28, // 2 boxes = 28 capsules
        unitPrice: "0.85",
        subtotal: "23.80",
        profitMargin: "6.80",
      },
    ]);

    // 2. Yesterday's sale (still this month/year)
    const yesterday = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
    const sale2 = await db
      .insert(schema.sales)
      .values({
        receiptNumber: "REC-20261109-002",
        userId: cashierUser.id,
        customerId: insertedCustomers[1].id,
        totalAmount: "85.00",
        totalProfit: "32.50",
        paymentMethod: "CREDIT",
        createdAt: yesterday,
      })
      .returning();

    await db.insert(schema.saleItems).values({
      saleId: sale2[0].id,
      batchId: brufenBatch.id,
      quantitySoldUnits: 200,
      unitPrice: "0.14",
      subtotal: "28.00",
      profitMargin: "10.00",
    });

    console.log("🚚 Seeding Purchases for Weekly Inflow...");
    const purchaseThisWeek = await db
      .insert(schema.purchases)
      .values({
        supplierId: gsk.id,
        invoiceNumber: "INV-GSK-88210",
        totalCost: "900.00",
        amountPaid: "500.00",
        createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (this week)
      })
      .returning();

    await db.insert(schema.purchaseItems).values({
      purchaseId: purchaseThisWeek[0].id,
      batchId: panadolBatch.id,
      boxesPurchased: "50.00",
      buyPricePerBox: "18.00",
      subtotal: "900.00",
    });

    console.log("✅ Seed completed successfully!");
    console.log("Default credentials:");
    console.log("  Admin:   username = 'admin'   / password = 'admin123'");
    console.log("  Cashier: username = 'cashier' / password = 'cashier123'");
  } catch (error) {
    console.error("❌ Seed error:", error);
  } finally {
    await client.end();
  }
}

runSeed();
