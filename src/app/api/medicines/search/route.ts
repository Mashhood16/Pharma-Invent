import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicines, batches } from "@/db/schema";
import { eq, or, ilike, sql, and } from "drizzle-orm";
import { offlineStore } from "@/db/offline-store";
import { resolveTenant } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId } = tenantRes.tenant;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const barcode = searchParams.get("barcode")?.trim();

    try {
      if (!query && !barcode) {
        const results = await db.query.medicines.findMany({
          where: eq(medicines.pharmacyId, pharmacyId),
          limit: 20,
          with: {
            batches: {
              where: sql`${batches.boxesInStock} > 0`,
            },
          },
        });
        return NextResponse.json(results);
      }

      if (barcode) {
        const medicine = await db.query.medicines.findFirst({
          where: and(eq(medicines.pharmacyId, pharmacyId), eq(medicines.barcode, barcode)),
          with: {
            batches: {
              where: sql`${batches.boxesInStock} > 0`,
            },
          },
        });
        return NextResponse.json(medicine ? [medicine] : []);
      }

      const results = await db.query.medicines.findMany({
        where: and(
          eq(medicines.pharmacyId, pharmacyId),
          or(
            ilike(medicines.brandName, `%${query}%`),
            ilike(medicines.genericFormula, `%${query}%`)
          )
        ),
        limit: 25,
        with: {
          batches: {
            where: sql`${batches.boxesInStock} > 0`,
          },
        },
      });

      return NextResponse.json(results);
    } catch {
      // Offline fallback scoped to pharmacy
      const offlineResults = offlineStore.searchMedicines(pharmacyId, query, barcode || "");
      return NextResponse.json(offlineResults);
    }
  } catch (error: any) {
    console.error("Medicine search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
