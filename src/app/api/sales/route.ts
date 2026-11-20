import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { sales, saleItems, batches, medicines, customers } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";
import { offlineStore } from "@/db/offline-store";
import { resolveTenant } from "@/lib/tenant";

const checkoutSchema = z.object({
  customerId: z.string().nullable().optional(),
  paymentMethod: z.enum(["CASH", "CREDIT"]),
  discount: z.number().min(0).default(0),
  items: z
    .array(
      z.object({
        batchId: z.string(),
        quantitySoldUnits: z.number().int().positive(),
        unitPrice: z.number().positive(),
      })
    )
    .min(1, "Cart cannot be empty"),
});

export async function POST(request: Request) {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId, user } = tenantRes.tenant;

    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { customerId, paymentMethod, discount, items } = validation.data;

    if (isDbConfigured) {
      try {
        // 1. Try PostgreSQL ACID Transaction scoped to pharmacy
        const result = await db.transaction(async (tx) => {
        let calculatedTotalAmount = 0;
        let calculatedTotalProfit = 0;

        const preparedItems: {
          batchId: string;
          brandName: string;
          batchNumber: string;
          quantitySoldUnits: number;
          unitPrice: string;
          subtotal: string;
          profitMargin: string;
          newStock: string;
        }[] = [];

        for (const item of items) {
          const [batch] = await tx
            .select({
              id: batches.id,
              batchNumber: batches.batchNumber,
              boxesInStock: batches.boxesInStock,
              unitsPerBox: batches.unitsPerBox,
              buyPricePerBox: batches.buyPricePerBox,
              retailPricePerUnit: batches.retailPricePerUnit,
              medicineBrandName: medicines.brandName,
            })
            .from(batches)
            .innerJoin(medicines, eq(batches.medicineId, medicines.id))
            .where(and(eq(batches.id, item.batchId), eq(medicines.pharmacyId, pharmacyId)))
            .limit(1);

          if (!batch) {
            throw new Error(`Batch ID ${item.batchId} not found in this pharmacy.`);
          }

          const currentBoxes = parseFloat(batch.boxesInStock);
          const boxesNeeded = item.quantitySoldUnits / batch.unitsPerBox;

          if (boxesNeeded > currentBoxes + 0.0001) {
            throw new Error(
              `Insufficient stock for ${batch.medicineBrandName} (Batch ${batch.batchNumber}). Requested: ${item.quantitySoldUnits} units, but only ${currentBoxes.toFixed(2)} boxes remain.`
            );
          }

          const lineTotal = item.quantitySoldUnits * item.unitPrice;
          const unitCost = parseFloat(batch.buyPricePerBox) / batch.unitsPerBox;
          const lineProfit = (item.unitPrice - unitCost) * item.quantitySoldUnits;

          calculatedTotalAmount += lineTotal;
          calculatedTotalProfit += lineProfit;

          preparedItems.push({
            batchId: item.batchId,
            brandName: batch.medicineBrandName,
            batchNumber: batch.batchNumber,
            quantitySoldUnits: item.quantitySoldUnits,
            unitPrice: item.unitPrice.toFixed(2),
            subtotal: lineTotal.toFixed(2),
            profitMargin: lineProfit.toFixed(2),
            newStock: Math.max(0, currentBoxes - boxesNeeded).toFixed(4),
          });
        }

        const finalTotalAmount = Math.max(0, calculatedTotalAmount - discount);
        const finalTotalProfit = calculatedTotalProfit - discount;

        for (const item of preparedItems) {
          await tx
            .update(batches)
            .set({
              boxesInStock: item.newStock,
              updatedAt: new Date(),
            })
            .where(eq(batches.id, item.batchId));
        }

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const receiptNumber = `REC-${dateStr}-${randomSuffix}`;

        const [saleRecord] = await tx
          .insert(sales)
          .values({
            pharmacyId,
            receiptNumber,
            userId: user.userId,
            customerId: customerId || null,
            totalAmount: finalTotalAmount.toFixed(2),
            totalProfit: finalTotalProfit.toFixed(2),
            paymentMethod,
            createdAt: new Date(),
          })
          .returning();

        for (const item of preparedItems) {
          await tx.insert(saleItems).values({
            saleId: saleRecord.id,
            batchId: item.batchId,
            quantitySoldUnits: item.quantitySoldUnits,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            profitMargin: item.profitMargin,
          });
        }

        if (paymentMethod === "CREDIT" && customerId) {
          await tx
            .update(customers)
            .set({
              pendingCredit: sql`${customers.pendingCredit} + ${finalTotalAmount.toFixed(2)}`,
              updatedAt: new Date(),
            })
            .where(and(eq(customers.id, customerId), eq(customers.pharmacyId, pharmacyId)));
        }

        return {
          saleId: saleRecord.id,
          receiptNumber: saleRecord.receiptNumber,
          totalAmount: finalTotalAmount,
          totalProfit: finalTotalProfit,
          paymentMethod,
          itemsCount: preparedItems.length,
        };
      });

      return NextResponse.json({
        success: true,
        message: "Sale processed successfully",
        sale: result,
      });
      } catch (dbErr: any) {
        if (dbErr.message && dbErr.message.includes("Insufficient stock")) {
          throw dbErr;
        }
        // Fallback to offline store
      }
    }

    // If DB is unreachable, execute in offline store scoped to pharmacy
    const offlineSale = offlineStore.processSale(
      pharmacyId,
      items,
      customerId || null,
      paymentMethod,
      discount,
      user.name,
      user.userId
    );

      return NextResponse.json({
        success: true,
        message: "Sale processed in local offline mode",
        sale: {
          saleId: offlineSale.id,
          receiptNumber: offlineSale.receiptNumber,
          totalAmount: offlineSale.totalAmount,
          totalProfit: offlineSale.totalProfit,
          paymentMethod: offlineSale.paymentMethod,
          itemsCount: offlineSale.items.length,
        },
      });
  } catch (error: any) {
    console.error("Checkout transaction error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process sale transaction",
      },
      { status: 400 }
    );
  }
}

// DELETE: Void a sale transaction and restore inventory stock
export async function DELETE(request: Request) {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId, user } = tenantRes.tenant;

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin role required to void sales." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
    }

    try {
      await db.transaction(async (tx) => {
        const [sale] = await tx
          .select()
          .from(sales)
          .where(and(eq(sales.id, id), eq(sales.pharmacyId, pharmacyId)));
        if (!sale) return;

        const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, id));

        for (const item of items) {
          const [batch] = await tx.select().from(batches).where(eq(batches.id, item.batchId));
          if (batch) {
            const boxesToRestore = item.quantitySoldUnits / batch.unitsPerBox;
            await tx
              .update(batches)
              .set({
                boxesInStock: sql`${batches.boxesInStock} + ${boxesToRestore}`,
              })
              .where(eq(batches.id, item.batchId));
          }
        }

        if (sale.paymentMethod === "CREDIT" && sale.customerId) {
          await tx
            .update(customers)
            .set({
              pendingCredit: sql`GREATEST(0, ${customers.pendingCredit} - ${sale.totalAmount})`,
              updatedAt: new Date(),
            })
            .where(and(eq(customers.id, sale.customerId), eq(customers.pharmacyId, pharmacyId)));
        }

        await tx.delete(saleItems).where(eq(saleItems.saleId, id));
        await tx.delete(sales).where(eq(sales.id, id));
      });

      return NextResponse.json({ success: true, message: "Sale voided and inventory restored" });
    } catch {
      const success = offlineStore.deleteSale(pharmacyId, id);
      if (success) {
        return NextResponse.json({ success: true, message: "Sale removed in offline mode" });
      }
      return NextResponse.json({ error: "Sale not found in this pharmacy" }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
