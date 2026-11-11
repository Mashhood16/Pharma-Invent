import { NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, batches, medicines, customers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { offlineStore } from "@/db/offline-store";

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { customerId, paymentMethod, discount, items } = validation.data;

    try {
      // 1. Try PostgreSQL ACID Transaction
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
            .where(eq(batches.id, item.batchId))
            .for("update");

          if (!batch) {
            throw new Error(`Batch ID ${item.batchId} not found in inventory.`);
          }

          const currentBoxes = parseFloat(batch.boxesInStock);
          const unitsPerBox = batch.unitsPerBox || 1;
          const boxesNeeded = item.quantitySoldUnits / unitsPerBox;

          if (boxesNeeded > currentBoxes + 0.0001) {
            throw new Error(
              `Insufficient stock for ${batch.medicineBrandName} (Batch ${batch.batchNumber}). Requested: ${item.quantitySoldUnits} units, available: ${currentBoxes.toFixed(2)} boxes.`
            );
          }

          const newBoxesInStock = Math.max(0, currentBoxes - boxesNeeded);
          const costPerBox = parseFloat(batch.buyPricePerBox);
          const costPerUnit = costPerBox / unitsPerBox;
          const subtotal = item.quantitySoldUnits * item.unitPrice;
          const itemProfit = (item.unitPrice - costPerUnit) * item.quantitySoldUnits;

          calculatedTotalAmount += subtotal;
          calculatedTotalProfit += itemProfit;

          preparedItems.push({
            batchId: batch.id,
            brandName: batch.medicineBrandName,
            batchNumber: batch.batchNumber,
            quantitySoldUnits: item.quantitySoldUnits,
            unitPrice: item.unitPrice.toFixed(2),
            subtotal: subtotal.toFixed(2),
            profitMargin: itemProfit.toFixed(2),
            newStock: newBoxesInStock.toFixed(4),
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
            .where(eq(customers.id, customerId));
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
        throw dbErr; // Re-throw business logic errors directly
      }

      // If DB is unreachable, execute in offline store
      const offlineSale = offlineStore.processSale(
        items,
        customerId || null,
        paymentMethod,
        discount
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
    }
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
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required to void sales." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 });
    }

    try {
      await db.transaction(async (tx) => {
        // 1. Find sale
        const [sale] = await tx.select().from(sales).where(eq(sales.id, id));
        if (!sale) return;

        // 2. Find sale items
        const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, id));

        // 3. Restore stock to batches
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

        // 4. If credit sale, deduct from customer pending credit
        if (sale.paymentMethod === "CREDIT" && sale.customerId) {
          await tx
            .update(customers)
            .set({
              pendingCredit: sql`GREATEST(0, ${customers.pendingCredit} - ${sale.totalAmount})`,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, sale.customerId));
        }

        // 5. Delete sale items and sale record
        await tx.delete(saleItems).where(eq(saleItems.saleId, id));
        await tx.delete(sales).where(eq(sales.id, id));
      });

      return NextResponse.json({ success: true, message: "Sale voided and inventory restored" });
    } catch {
      // Offline store fallback
      const success = offlineStore.deleteSale(id);
      if (success) {
        return NextResponse.json({ success: true, message: "Sale removed in offline mode" });
      }
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
