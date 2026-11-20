import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { sales, users, customers } from "@/db/schema";
import { sql, gte, lte, and, desc, eq } from "drizzle-orm";
import { offlineStore } from "@/db/offline-store";
import { resolveTenant } from "@/lib/tenant";

export async function GET() {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId, user } = tenantRes.tenant;

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    if (isDbConfigured) {
      try {
        const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

      const [dailyMetrics] = await db
        .select({
          sales: sql<string>`COALESCE(SUM(total_amount), 0)`,
          profit: sql<string>`COALESCE(SUM(total_profit), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.pharmacyId, pharmacyId),
            gte(sales.createdAt, startOfToday),
            lte(sales.createdAt, endOfToday)
          )
        );

      const [monthlyMetrics] = await db
        .select({
          sales: sql<string>`COALESCE(SUM(total_amount), 0)`,
          profit: sql<string>`COALESCE(SUM(total_profit), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.pharmacyId, pharmacyId),
            gte(sales.createdAt, startOfMonth),
            lte(sales.createdAt, endOfMonth)
          )
        );

      const [yearlyMetrics] = await db
        .select({
          sales: sql<string>`COALESCE(SUM(total_amount), 0)`,
          profit: sql<string>`COALESCE(SUM(total_profit), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.pharmacyId, pharmacyId),
            gte(sales.createdAt, startOfYear),
            lte(sales.createdAt, endOfYear)
          )
        );

      const recentSales = await db
        .select({
          id: sales.id,
          receiptNumber: sales.receiptNumber,
          totalAmount: sales.totalAmount,
          totalProfit: sales.totalProfit,
          paymentMethod: sales.paymentMethod,
          createdAt: sales.createdAt,
          cashierName: users.name,
          customerName: customers.name,
        })
        .from(sales)
        .innerJoin(users, eq(sales.userId, users.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .where(eq(sales.pharmacyId, pharmacyId))
        .orderBy(desc(sales.createdAt))
        .limit(30);

      return NextResponse.json({
        metrics: {
          daily: {
            sales: parseFloat(dailyMetrics?.sales || "0"),
            profit: parseFloat(dailyMetrics?.profit || "0"),
            orders: Number(dailyMetrics?.count || 0),
          },
          monthly: {
            sales: parseFloat(monthlyMetrics?.sales || "0"),
            profit: parseFloat(monthlyMetrics?.profit || "0"),
            orders: Number(monthlyMetrics?.count || 0),
          },
          yearly: {
            sales: parseFloat(yearlyMetrics?.sales || "0"),
            profit: parseFloat(yearlyMetrics?.profit || "0"),
            orders: Number(yearlyMetrics?.count || 0),
          },
        },
        recentSales,
      });
      } catch {
        // Fallback to offline store
      }
    }

    // Offline mode scoped strictly to this pharmacy
    const result = offlineStore.getFinancialMetrics(pharmacyId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Financials error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
