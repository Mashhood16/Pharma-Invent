import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicines, batches, suppliers } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { offlineStore } from "@/db/offline-store";

export async function GET() {
  try {
    try {
      const list = await db.query.medicines.findMany({
        orderBy: [desc(medicines.createdAt)],
        with: {
          batches: {
            with: {
              supplier: true,
            },
          },
        },
      });

      const enriched = list.map((med) => {
        const totalBoxes = med.batches.reduce(
          (sum, b) => sum + parseFloat(b.boxesInStock),
          0
        );
        return {
          ...med,
          totalBoxesInStock: totalBoxes,
          isLowStock: totalBoxes <= med.reorderLevel,
        };
      });

      return NextResponse.json(enriched);
    } catch {
      // Offline mode
      const enriched = offlineStore.medicines.map((med) => {
        const totalBoxes = med.batches.reduce(
          (sum, b) => sum + b.boxesInStock,
          0
        );
        return {
          ...med,
          totalBoxesInStock: totalBoxes,
          isLowStock: totalBoxes <= med.reorderLevel,
        };
      });
      return NextResponse.json(enriched);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      brandName,
      genericFormula,
      category,
      barcode,
      reorderLevel,
      initialBatch,
    } = body;

    if (!brandName || !genericFormula) {
      return NextResponse.json(
        { error: "Brand name and generic formula are required" },
        { status: 400 }
      );
    }

    try {
      const [newMed] = await db
        .insert(medicines)
        .values({
          brandName: brandName.trim(),
          genericFormula: genericFormula.trim(),
          category: category?.trim() || "Tablets (Oral)",
          barcode: barcode?.trim() || null,
          reorderLevel: Number(reorderLevel) || 2,
        })
        .returning();

      if (initialBatch && initialBatch.batchNumber && initialBatch.supplierId) {
        const unitsPerBox = Number(initialBatch.unitsPerBox) || 100;
        let unitPrice = Number(initialBatch.retailPricePerUnit) || 0;
        let boxPrice = Number(initialBatch.retailPricePerBox) || 0;

        if (boxPrice > 0 && unitPrice === 0) {
          unitPrice = boxPrice / unitsPerBox;
        } else if (unitPrice > 0 && boxPrice === 0) {
          boxPrice = unitPrice * unitsPerBox;
        }

        await db.insert(batches).values({
          medicineId: newMed.id,
          batchNumber: initialBatch.batchNumber.trim(),
          supplierId: initialBatch.supplierId,
          expiryDate: new Date(initialBatch.expiryDate),
          boxesInStock: (initialBatch.boxesInStock || 0).toString(),
          unitsPerBox,
          buyPricePerBox: (initialBatch.buyPricePerBox || 0).toString(),
          retailPricePerBox: boxPrice.toString(),
          retailPricePerUnit: unitPrice.toString(),
        });
      }

      return NextResponse.json(newMed);
    } catch {
      // Offline fallback creation
      const createdMed = offlineStore.addMedicine({
        brandName,
        genericFormula,
        category: category || "Tablets (Oral)",
        barcode: barcode || null,
        reorderLevel: Number(reorderLevel) || 2,
        initialBatch,
      });
      return NextResponse.json(createdMed);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a medicine permanently
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Medicine ID is required" }, { status: 400 });
    }

    try {
      await db.delete(medicines).where(eq(medicines.id, id));
      return NextResponse.json({ success: true, message: "Medicine deleted successfully" });
    } catch {
      const deleted = offlineStore.deleteMedicine(id);
      if (deleted) {
        return NextResponse.json({ success: true, message: "Medicine deleted from local store" });
      }
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
