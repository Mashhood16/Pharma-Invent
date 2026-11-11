import { NextResponse } from "next/server";
import { db } from "@/db";
import { sales, users, customers } from "@/db/schema";
import { sql, gte, lte, and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

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
        .where(and(gte(sales.createdAt, startOfToday), lte(sales.createdAt, endOfToday)));

      const [monthlyMetrics] = await db
        .select({
          sales: sql<string>`COALESCE(SUM(total_amount), 0)`,
          profit: sql<string>`COALESCE(SUM(total_profit), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .where(and(gte(sales.createdAt, startOfMonth), lte(sales.createdAt, endOfMonth)));

      const [yearlyMetrics] = await db
        .select({
          sales: sql<string>`COALESCE(SUM(total_amount), 0)`,
          profit: sql<string>`COALESCE(SUM(total_profit), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .where(and(gte(sales.createdAt, startOfYear), lte(sales.createdAt, endOfYear)));

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
      // Offline mode: exact metrics based strictly on recorded sales (starts at 0 with no dummy data)
      const allSales = offlineStore.sales;
      const now = new Date();

      const todaySales = allSales.filter((s) => {
        const d = new Date(s.createdAt);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const monthSales = allSales.filter((s) => {
        const d = new Date(s.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const dailyTotal = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
      const dailyProfit = todaySales.reduce((sum, s) => sum + s.totalProfit, 0);
      const monthlyTotal = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const monthlyProfit = monthSales.reduce((sum, s) => sum + s.totalProfit, 0);
      const yearlyTotal = allSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const yearlyProfit = allSales.reduce((sum, s) => sum + s.totalProfit, 0);

      return NextResponse.json({
        metrics: {
          daily: { sales: dailyTotal, profit: dailyProfit, orders: todaySales.length },
          monthly: { sales: monthlyTotal, profit: monthlyProfit, orders: monthSales.length },
          yearly: { sales: yearlyTotal, profit: yearlyProfit, orders: allSales.length },
        },
        recentSales: allSales,
      });
    }
  } catch (error: any) {
    console.error("Financials error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
