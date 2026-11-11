import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchases, purchaseItems, suppliers, batches, medicines } from "@/db/schema";
import { eq, gte, sql, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(now.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);

      const supplierInflow = await db
        .select({
          supplierId: suppliers.id,
          supplierName: suppliers.name,
          contactInfo: suppliers.contactInfo,
          ledgerBalance: suppliers.ledgerBalance,
          totalCost: sql<string>`COALESCE(SUM(${purchases.totalCost}), 0)`,
          totalPaid: sql<string>`COALESCE(SUM(${purchases.amountPaid}), 0)`,
          ordersCount: sql<number>`COUNT(${purchases.id})`,
        })
        .from(suppliers)
        .innerJoin(purchases, eq(suppliers.id, purchases.supplierId))
        .where(gte(purchases.createdAt, startOfWeek))
        .groupBy(suppliers.id, suppliers.name, suppliers.contactInfo, suppliers.ledgerBalance);

      const weeklyPurchasesList = await db.query.purchases.findMany({
        where: gte(purchases.createdAt, startOfWeek),
        orderBy: [desc(purchases.createdAt)],
        with: {
          supplier: true,
          items: {
            with: {
              batch: {
                with: {
                  medicine: true,
                },
              },
            },
          },
        },
      });

      const totalMoneySpentThisWeek = supplierInflow.reduce(
        (sum, s) => sum + parseFloat(s.totalCost),
        0
      );

      return NextResponse.json({
        startOfWeek: startOfWeek.toISOString(),
        totalMoneySpentThisWeek,
        supplierInflow,
        weeklyPurchasesList,
      });
    } catch {
      // Offline mode - clean calculations
      const totalSpent = offlineStore.purchases.reduce((sum, p) => sum + p.totalCost, 0);
      const supplierInflowMap: Record<string, any> = {};

      for (const p of offlineStore.purchases) {
        if (!supplierInflowMap[p.supplierId]) {
          supplierInflowMap[p.supplierId] = {
            supplierId: p.supplierId,
            supplierName: p.supplier.name,
            totalCost: 0,
            totalPaid: 0,
            ordersCount: 0,
          };
        }
        supplierInflowMap[p.supplierId].totalCost += p.totalCost;
        supplierInflowMap[p.supplierId].totalPaid += p.amountPaid;
        supplierInflowMap[p.supplierId].ordersCount += 1;
      }

      return NextResponse.json({
        startOfWeek: new Date().toISOString(),
        totalMoneySpentThisWeek: totalSpent,
        supplierInflow: Object.values(supplierInflowMap),
        weeklyPurchasesList: offlineStore.purchases,
      });
    }
  } catch (error: any) {
    console.error("Weekly inflow error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { supplierId, invoiceNumber, totalCost, amountPaid, items } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Supplier and purchase items are required" },
        { status: 400 }
      );
    }

    try {
      const [newPurchase] = await db
        .insert(purchases)
        .values({
          supplierId,
          invoiceNumber: invoiceNumber || null,
          totalCost: (totalCost || 0).toString(),
          amountPaid: (amountPaid || 0).toString(),
        })
        .returning();

      return NextResponse.json(newPurchase);
    } catch {
      // Offline fallback
      const purchase = offlineStore.addPurchase({
        supplierId,
        invoiceNumber,
        totalCost: Number(totalCost) || 0,
        amountPaid: Number(amountPaid) || 0,
        items: items || [],
      });
      return NextResponse.json(purchase);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
