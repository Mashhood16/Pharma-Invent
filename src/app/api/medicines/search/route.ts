import { NextResponse } from "next/server";
import { db } from "@/db";
import { medicines, batches } from "@/db/schema";
import { eq, or, ilike, sql } from "drizzle-orm";
import { offlineStore } from "@/db/offline-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const barcode = searchParams.get("barcode")?.trim();

    try {
      if (!query && !barcode) {
        const results = await db.query.medicines.findMany({
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
          where: eq(medicines.barcode, barcode),
          with: {
            batches: {
              where: sql`${batches.boxesInStock} > 0`,
            },
          },
        });
        return NextResponse.json(medicine ? [medicine] : []);
      }

      const results = await db.query.medicines.findMany({
        where: or(
          ilike(medicines.brandName, `%${query}%`),
          ilike(medicines.genericFormula, `%${query}%`)
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
      // Offline fallback
      const offlineResults = offlineStore.searchMedicines(query, barcode || "");
      return NextResponse.json(offlineResults);
    }
  } catch (error: any) {
    console.error("Medicine search error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
