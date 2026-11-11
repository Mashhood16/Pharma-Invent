import { NextResponse } from "next/server";
import { db } from "@/db";
import { batches, medicines, suppliers } from "@/db/schema";
import { eq, lte, and, sql, asc } from "drizzle-orm";
import { offlineStore } from "@/db/offline-store";

export async function GET() {
  try {
    const today = new Date();

    try {
      const expiredList = await db
        .select({
          batchId: batches.id,
          batchNumber: batches.batchNumber,
          expiryDate: batches.expiryDate,
          boxesInStock: batches.boxesInStock,
          unitsPerBox: batches.unitsPerBox,
          buyPricePerBox: batches.buyPricePerBox,
          retailPricePerUnit: batches.retailPricePerUnit,
          brandName: medicines.brandName,
          genericFormula: medicines.genericFormula,
          category: medicines.category,
          supplierId: suppliers.id,
          supplierName: suppliers.name,
          supplierContact: suppliers.contactInfo,
        })
        .from(batches)
        .innerJoin(medicines, eq(batches.medicineId, medicines.id))
        .innerJoin(suppliers, eq(batches.supplierId, suppliers.id))
        .where(
          and(
            lte(batches.expiryDate, today),
            sql`${batches.boxesInStock} > 0`
          )
        )
        .orderBy(asc(batches.expiryDate));

      const ninetyDaysAhead = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      const nearExpiryList = await db
        .select({
          batchId: batches.id,
          batchNumber: batches.batchNumber,
          expiryDate: batches.expiryDate,
          boxesInStock: batches.boxesInStock,
          unitsPerBox: batches.unitsPerBox,
          buyPricePerBox: batches.buyPricePerBox,
          retailPricePerUnit: batches.retailPricePerUnit,
          brandName: medicines.brandName,
          genericFormula: medicines.genericFormula,
          category: medicines.category,
          supplierId: suppliers.id,
          supplierName: suppliers.name,
        })
        .from(batches)
        .innerJoin(medicines, eq(batches.medicineId, medicines.id))
        .innerJoin(suppliers, eq(batches.supplierId, suppliers.id))
        .where(
          and(
            sql`${batches.expiryDate} > ${today}`,
            lte(batches.expiryDate, ninetyDaysAhead),
            sql`${batches.boxesInStock} > 0`
          )
        )
        .orderBy(asc(batches.expiryDate));

      return NextResponse.json({
        expired: expiredList,
        nearExpiry: nearExpiryList,
      });
    } catch {
      // Offline fallback
      const expiredList: any[] = [];
      const nearExpiryList: any[] = [];
      const now = new Date();
      const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      for (const m of offlineStore.medicines) {
        for (const b of m.batches) {
          if (b.boxesInStock <= 0) continue;
          const exp = new Date(b.expiryDate);

          const item = {
            batchId: b.id,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            boxesInStock: b.boxesInStock,
            unitsPerBox: b.unitsPerBox,
            buyPricePerBox: b.buyPricePerBox,
            retailPricePerUnit: b.retailPricePerUnit,
            brandName: m.brandName,
            genericFormula: m.genericFormula,
            category: m.category,
            supplierId: b.supplierId,
            supplierName: b.supplierName,
            supplierContact: b.supplierContact,
          };

          if (exp <= now) {
            expiredList.push(item);
          } else if (exp <= ninetyDays) {
            nearExpiryList.push(item);
          }
        }
      }

      return NextResponse.json({
        expired: expiredList,
        nearExpiry: nearExpiryList,
      });
    }
  } catch (error: any) {
    console.error("Expiry fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { batchId } = await request.json();

    if (!batchId) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 });
    }

    try {
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, batchId))
        .limit(1);

      if (batch) {
        const boxesReturned = parseFloat(batch.boxesInStock);
        const totalCreditClaim = boxesReturned * parseFloat(batch.buyPricePerBox);

        await db.transaction(async (tx) => {
          await tx
            .update(batches)
            .set({
              boxesInStock: "0.0000",
              updatedAt: new Date(),
            })
            .where(eq(batches.id, batchId));

          await tx
            .update(suppliers)
            .set({
              ledgerBalance: sql`${suppliers.ledgerBalance} - ${totalCreditClaim.toFixed(2)}`,
              updatedAt: new Date(),
            })
            .where(eq(suppliers.id, batch.supplierId));
        });

        return NextResponse.json({
          success: true,
          message: `Successfully processed RTV for Batch ${batch.batchNumber}. ${boxesReturned} boxes pulled from shelf.`,
          creditClaim: totalCreditClaim,
        });
      }
    } catch {
      // Offline fallback RTV
      const res = offlineStore.processRtv(batchId);
      return NextResponse.json({
        success: true,
        message: `Processed local RTV for Batch ${res.batchNumber}. ${res.returnedBoxes} boxes pulled from shelf.`,
        creditClaim: res.claimValue,
      });
    }

    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
