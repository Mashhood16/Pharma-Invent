import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { customers } from "@/db/schema";
import { ilike, or, desc, eq, and } from "drizzle-orm";
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

    if (isDbConfigured) {
      try {
        if (!query) {
          const list = await db
            .select()
            .from(customers)
            .where(eq(customers.pharmacyId, pharmacyId))
            .orderBy(desc(customers.updatedAt))
            .limit(30);
          return NextResponse.json(list);
        }

        const list = await db
          .select()
          .from(customers)
          .where(
            and(
              eq(customers.pharmacyId, pharmacyId),
              or(
                ilike(customers.name, `%${query}%`),
                ilike(customers.phone, `%${query}%`)
              )
            )
          )
          .limit(20);

        return NextResponse.json(list);
      } catch {
        // Fallback to offline store
      }
    }

    // Offline fallback scoped to pharmacy
    const list = offlineStore.getCustomers(pharmacyId);
    if (!query) return NextResponse.json(list);
    const q = query.toLowerCase();
    const filtered = list.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
    return NextResponse.json(filtered);
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
    const { pharmacyId } = tenantRes.tenant;

    const { name, phone, initialCredit } = await request.json();

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Customer name and phone are required" },
        { status: 400 }
      );
    }

    if (isDbConfigured) {
      try {
        const [newCustomer] = await db
          .insert(customers)
          .values({
            pharmacyId,
            name: name.trim(),
            phone: phone.trim(),
            pendingCredit: (initialCredit || 0).toString(),
          })
          .returning();

        return NextResponse.json(newCustomer);
      } catch {
        // Fallback to offline store
      }
    }

    const newCust = offlineStore.addCustomer(pharmacyId, {
      name,
      phone,
      pendingCredit: parseFloat(initialCredit) || 0,
    });
    return NextResponse.json(newCust);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
