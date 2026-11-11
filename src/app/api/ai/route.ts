import { NextResponse } from "next/server";
import { db } from "@/db";
import { sales, batches, medicines, suppliers, purchases } from "@/db/schema";
import { eq, sql, and, gte, lte, desc, ilike } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";

async function getDailyMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const [metrics] = await db
      .select({
        totalSales: sql<string>`COALESCE(SUM(total_amount), 0)`,
        totalProfit: sql<string>`COALESCE(SUM(total_profit), 0)`,
        orderCount: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(gte(sales.createdAt, today));

    return {
      date: today.toISOString().split("T")[0],
      totalSales: parseFloat(metrics?.totalSales || "0").toFixed(2),
      totalProfit: parseFloat(metrics?.totalProfit || "0").toFixed(2),
      orderCount: Number(metrics?.orderCount || 0),
    };
  } catch {
    const todaySales = offlineStore.sales.filter((s) => {
      const d = new Date(s.createdAt);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    });
    const totalSales = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = todaySales.reduce((sum, s) => sum + s.totalProfit, 0);

    return {
      date: today.toISOString().split("T")[0],
      totalSales: totalSales.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      orderCount: todaySales.length,
    };
  }
}

async function getExpiringBatches(daysAhead = 30) {
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  try {
    const results = await db
      .select({
        batchNumber: batches.batchNumber,
        brandName: medicines.brandName,
        genericFormula: medicines.genericFormula,
        expiryDate: batches.expiryDate,
        boxesInStock: batches.boxesInStock,
        supplierName: suppliers.name,
      })
      .from(batches)
      .innerJoin(medicines, eq(batches.medicineId, medicines.id))
      .innerJoin(suppliers, eq(batches.supplierId, suppliers.id))
      .where(lte(batches.expiryDate, future))
      .orderBy(batches.expiryDate);

    return results.map((b) => ({
      brandName: b.brandName,
      genericFormula: b.genericFormula,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate.toISOString().split("T")[0],
      boxesInStock: parseFloat(b.boxesInStock).toFixed(2),
      supplier: b.supplierName,
      isExpired: new Date(b.expiryDate) < new Date(),
    }));
  } catch {
    const results: any[] = [];
    for (const m of offlineStore.medicines) {
      for (const b of m.batches) {
        if (b.boxesInStock <= 0) continue;
        const exp = new Date(b.expiryDate);
        if (exp <= future) {
          results.push({
            brandName: m.brandName,
            genericFormula: m.genericFormula,
            batchNumber: b.batchNumber,
            expiryDate: exp.toISOString().split("T")[0],
            boxesInStock: b.boxesInStock.toFixed(2),
            supplier: b.supplierName,
            isExpired: exp < now,
          });
        }
      }
    }
    return results;
  }
}

async function checkStockAndAlternatives(searchTerm: string) {
  try {
    const matchingMedicines = await db
      .select({
        id: medicines.id,
        brandName: medicines.brandName,
        genericFormula: medicines.genericFormula,
        category: medicines.category,
        barcode: medicines.barcode,
      })
      .from(medicines)
      .where(ilike(medicines.brandName, `%${searchTerm}%`))
      .limit(5);

    if (matchingMedicines.length === 0) {
      return { found: false, message: `No medicine found matching '${searchTerm}'.` };
    }

    const reports = [];

    for (const med of matchingMedicines) {
      const medBatches = await db
        .select({
          batchNumber: batches.batchNumber,
          boxesInStock: batches.boxesInStock,
          unitsPerBox: batches.unitsPerBox,
          expiryDate: batches.expiryDate,
          retailPricePerUnit: batches.retailPricePerUnit,
        })
        .from(batches)
        .where(eq(batches.medicineId, med.id));

      const totalBoxes = medBatches.reduce(
        (sum, b) => sum + parseFloat(b.boxesInStock),
        0
      );

      const alternatives = await db
        .select({
          brandName: medicines.brandName,
        })
        .from(medicines)
        .where(
          and(
            eq(medicines.genericFormula, med.genericFormula),
            sql`${medicines.id} != ${med.id}`
          )
        );

      reports.push({
        brandName: med.brandName,
        genericFormula: med.genericFormula,
        category: med.category,
        totalBoxesInStock: totalBoxes.toFixed(2),
        isLowStock: totalBoxes <= 2,
        batches: medBatches.map((b) => ({
          batchNumber: b.batchNumber,
          boxesInStock: parseFloat(b.boxesInStock).toFixed(2),
          unitsPerBox: b.unitsPerBox,
          expiryDate: b.expiryDate.toISOString().split("T")[0],
          retailPricePerUnit: b.retailPricePerUnit,
        })),
        genericAlternatives: alternatives.map((a) => a.brandName),
      });
    }

    return { found: true, medicines: reports };
  } catch {
    const matches = offlineStore.searchMedicines(searchTerm);
    if (matches.length === 0) {
      return { found: false, message: `No medicine found matching '${searchTerm}'.` };
    }

    const reports = matches.map((m) => {
      const totalBoxes = m.batches.reduce((sum, b) => sum + b.boxesInStock, 0);
      const alternatives = offlineStore.medicines
        .filter((o) => o.genericFormula === m.genericFormula && o.id !== m.id)
        .map((o) => o.brandName);

      return {
        brandName: m.brandName,
        genericFormula: m.genericFormula,
        category: m.category,
        totalBoxesInStock: totalBoxes.toFixed(2),
        isLowStock: totalBoxes <= m.reorderLevel,
        batches: m.batches.map((b) => ({
          batchNumber: b.batchNumber,
          boxesInStock: b.boxesInStock.toFixed(2),
          unitsPerBox: b.unitsPerBox,
          expiryDate: b.expiryDate.split("T")[0],
          retailPricePerUnit: b.retailPricePerUnit.toFixed(2),
        })),
        genericAlternatives: alternatives,
      };
    });

    return { found: true, medicines: reports };
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const lowerMsg = message.toLowerCase();
    let toolResult: any = null;
    let toolUsed = "";

    if (
      lowerMsg.includes("profit") ||
      lowerMsg.includes("sales today") ||
      lowerMsg.includes("daily") ||
      lowerMsg.includes("revenue")
    ) {
      toolUsed = "get_daily_metrics";
      toolResult = await getDailyMetrics();
    } else if (
      lowerMsg.includes("expir") ||
      lowerMsg.includes("rtv") ||
      lowerMsg.includes("out of date")
    ) {
      toolUsed = "get_expiring_batches";
      const days = lowerMsg.includes("next month") ? 35 : 30;
      toolResult = await getExpiringBatches(days);
    } else {
      const match = message.match(/(?:of|for|about|check|left|stock)\s+([a-zA-Z0-9\s]+?)(?:\?|$|\s+left|\s+in stock)/i);
      const queryName = match ? match[1].trim() : message.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      toolUsed = "check_stock_and_alternatives";
      toolResult = await checkStockAndAlternatives(queryName || "");
    }

    let answer = "";

    if (toolUsed === "get_daily_metrics") {
      if (user.role !== "ADMIN") {
        answer = `Today: ${toolResult.orderCount} transaction(s) processed.`;
      } else {
        answer = `Today's Financial Summary (${toolResult.date}):\n• Total Sales: Rs. ${toolResult.totalSales}\n• Net Profit: Rs. ${toolResult.totalProfit}\n• Orders Count: ${toolResult.orderCount}`;
      }
    } else if (toolUsed === "get_expiring_batches") {
      if (toolResult.length === 0) {
        answer = `No batches are currently expired or expiring within the selected period.`;
      } else {
        const expired = toolResult.filter((b: any) => b.isExpired);
        const near = toolResult.filter((b: any) => !b.isExpired);

        answer = `Expiry Status:\n`;
        if (expired.length > 0) {
          answer += `Expired:\n` + expired.map((e: any) => `• ${e.brandName} (Bt: ${e.batchNumber}) - ${e.boxesInStock} boxes remaining.`).join("\n");
        }
        if (near.length > 0) {
          answer += `\nNear Expiry:\n` + near.map((n: any) => `• ${n.brandName} (Bt: ${n.batchNumber}) - ${n.boxesInStock} boxes (Exp: ${n.expiryDate}).`).join("\n");
        }
      }
    } else {
      if (!toolResult.found || toolResult.medicines?.length === 0) {
        answer = `No matching medicine found in inventory.`;
      } else {
        const med = toolResult.medicines[0];
        answer = `Product: ${med.brandName} (${med.genericFormula})\n• Total Stock: ${med.totalBoxesInStock} boxes ${med.isLowStock ? "[LOW STOCK]" : ""}\n• Batches: ${med.batches.length}`;
        if (med.genericAlternatives && med.genericAlternatives.length > 0) {
          answer += `\n• Generic Alternatives: ${med.genericAlternatives.join(", ")}`;
        }
      }
    }

    return NextResponse.json({
      reply: answer,
      toolUsed,
      data: toolResult,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
