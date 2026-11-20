import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { batches, medicines, suppliers } from "@/db/schema";
import { eq, lte, and, sql, asc } from "drizzle-orm";
import { offlineStore } from "@/db/offline-store";
import { resolveTenant } from "@/lib/tenant";

export async function GET() {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId } = tenantRes.tenant;

    const today = new Date();

    if (isDbConfigured) {
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
            eq(medicines.pharmacyId, pharmacyId),
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
            eq(medicines.pharmacyId, pharmacyId),
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
        // Fallback to offline store
      }
    }

    // Offline fallback scoped to pharmacy
      const expiredList: any[] = [];
      const nearExpiryList: any[] = [];
      const now = new Date();
      const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const meds = offlineStore.getMedicines(pharmacyId);

      for (const m of meds) {
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
  } catch (error: any) {
    console.error("Expiry fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId } = tenantRes.tenant;

    const { batchId } = await request.json();

    if (!batchId) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 });
    }

    try {
      const [batch] = await db
        .select({
          id: batches.id,
          batchNumber: batches.batchNumber,
          boxesInStock: batches.boxesInStock,
          buyPricePerBox: batches.buyPricePerBox,
          supplierId: batches.supplierId,
        })
        .from(batches)
        .innerJoin(medicines, eq(batches.medicineId, medicines.id))
        .where(and(eq(batches.id, batchId), eq(medicines.pharmacyId, pharmacyId)))
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
            .where(and(eq(suppliers.id, batch.supplierId), eq(suppliers.pharmacyId, pharmacyId)));
        });

        return NextResponse.json({
          success: true,
          message: `Successfully processed RTV for Batch ${batch.batchNumber}. ${boxesReturned} boxes pulled from shelf.`,
          creditClaim: totalCreditClaim,
        });
      }
    } catch {
      const res = offlineStore.processRtv(pharmacyId, batchId);
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
