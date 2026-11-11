import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicines, batches, suppliers } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { offlineStore } from "@/db/offline-store";
import { getCurrentUser } from "@/lib/auth";
import { generateTemplateWorkbook } from "@/lib/excel-template";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";

    const buffer = generateTemplateWorkbook();

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="pharma-inventory-template.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const body = await request.json();
    const items = body?.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided for bulk upload." }, { status: 400 });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const row of items) {
      const brandName = (row.brandName || row["Brand Name"] || "").toString().trim();
      const genericFormula = (row.genericFormula || row["Generic Formula"] || "").toString().trim();

      if (!brandName || !genericFormula) {
        skippedCount++;
        continue;
      }

      const category = (row.category || row["Category"] || "Tablets (Oral)").toString().trim();
      const barcode = (row.barcode || row["Barcode"] || "").toString().trim() || null;
      const reorderLevel = parseInt(row.reorderLevel || row["Reorder Level"]) || 2;

      const batchNumber = (row.batchNumber || row["Batch Number"] || "B-01").toString().trim();
      const supplierName = (row.supplierName || row["Supplier Name"] || "Direct / Distribution").toString().trim();
      const expiryDate = row.expiryDate || row["Expiry Date (YYYY-MM-DD)"] || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const boxesInStock = parseFloat(row.boxesInStock || row["Boxes in Stock"]) || 0;
      const unitsPerBox = parseInt(row.unitsPerBox || row["Tabs per Box"]) || 100;
      const buyPricePerBox = parseFloat(row.buyPricePerBox || row["Buy Price per Box (PKR)"]) || 0;
      const sellPricePerBox = parseFloat(row.sellPricePerBox || row["Sell Price per Box (PKR)"]) || 0;
      let sellPricePerTab = parseFloat(row.sellPricePerTab || row["Sell Price per Tab (PKR)"]);

      // Auto calculate sell price per tab with math if not provided or 0
      if ((isNaN(sellPricePerTab) || sellPricePerTab <= 0) && sellPricePerBox > 0 && unitsPerBox > 0) {
        sellPricePerTab = Number((sellPricePerBox / unitsPerBox).toFixed(2));
      } else if (isNaN(sellPricePerTab)) {
        sellPricePerTab = 0;
      }

      try {
        // 1. Resolve or create supplier in PostgreSQL
        let [existingSup] = await db
          .select()
          .from(suppliers)
          .where(ilike(suppliers.name, supplierName))
          .limit(1);

        if (!existingSup) {
          const [createdSup] = await db
            .insert(suppliers)
            .values({
              name: supplierName,
              contactInfo: "Bulk imported",
              ledgerBalance: "0",
            })
            .returning();
          existingSup = createdSup;
        }

        // 2. Insert medicine
        const [newMed] = await db
          .insert(medicines)
          .values({
            brandName,
            genericFormula,
            category,
            barcode,
            reorderLevel,
          })
          .returning();

        // 3. Insert initial batch
        await db.insert(batches).values({
          medicineId: newMed.id,
          batchNumber,
          supplierId: existingSup.id,
          expiryDate: new Date(expiryDate),
          boxesInStock: boxesInStock.toString(),
          unitsPerBox,
          buyPricePerBox: buyPricePerBox.toString(),
          retailPricePerBox: sellPricePerBox.toString(),
          retailPricePerUnit: sellPricePerTab.toString(),
        });

        insertedCount++;
      } catch {
        // Fallback to offline store
        let offSup = offlineStore.suppliers.find(
          (s) => s.name.toLowerCase() === supplierName.toLowerCase()
        );
        if (!offSup) {
          offSup = {
            id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: supplierName,
            contactInfo: "Bulk imported",
            ledgerBalance: 0,
          };
          offlineStore.suppliers.push(offSup);
        }

        offlineStore.addMedicine({
          brandName,
          genericFormula,
          category,
          barcode,
          reorderLevel,
          initialBatch: {
            batchNumber,
            supplierId: offSup.id,
            expiryDate: new Date(expiryDate).toISOString(),
            boxesInStock,
            unitsPerBox,
            buyPricePerBox,
            retailPricePerBox: sellPricePerBox,
            retailPricePerUnit: sellPricePerTab,
          },
        });

        insertedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      skippedCount,
      message: `Successfully uploaded ${insertedCount} product(s) into inventory.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
