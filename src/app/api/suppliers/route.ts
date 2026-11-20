import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { suppliers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { offlineStore } from "@/db/offline-store";
import { resolveTenant } from "@/lib/tenant";

export async function GET() {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId } = tenantRes.tenant;

    if (isDbConfigured) {
      try {
        const list = await db.query.suppliers.findMany({
          where: eq(suppliers.pharmacyId, pharmacyId),
          orderBy: [desc(suppliers.updatedAt)],
          with: {
            batches: true,
            purchases: true,
          },
        });
        return NextResponse.json(list);
      } catch {
        // Fallback to offline store
      }
    }

    // Offline fallback scoped to pharmacy
    return NextResponse.json(offlineStore.getSuppliers(pharmacyId));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId, user } = tenantRes.tenant;

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, contactInfo, ledgerBalance } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    if (isDbConfigured) {
      try {
        const [newSupplier] = await db
          .insert(suppliers)
          .values({
            pharmacyId,
            name: name.trim(),
            contactInfo: contactInfo?.trim() || "",
            ledgerBalance: (ledgerBalance || 0).toString(),
          })
          .returning();

        return NextResponse.json(newSupplier);
      } catch {
        // Fallback to offline store
      }
    }

    const newSup = offlineStore.addSupplier(pharmacyId, {
      name,
      contactInfo,
      ledgerBalance: parseFloat(ledgerBalance) || 0,
    });
    return NextResponse.json(newSup);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
