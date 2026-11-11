import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { ilike, or, desc } from "drizzle-orm";
import { offlineStore } from "@/db/offline-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    try {
      if (!query) {
        const list = await db
          .select()
          .from(customers)
          .orderBy(desc(customers.updatedAt))
          .limit(30);
        return NextResponse.json(list);
      }

      const list = await db
        .select()
        .from(customers)
        .where(
          or(
            ilike(customers.name, `%${query}%`),
            ilike(customers.phone, `%${query}%`)
          )
        )
        .limit(20);

      return NextResponse.json(list);
    } catch {
      // Offline fallback
      if (!query) return NextResponse.json(offlineStore.customers);
      const q = query.toLowerCase();
      const filtered = offlineStore.customers.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      );
      return NextResponse.json(filtered);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, phone, initialCredit } = await request.json();

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Customer name and phone are required" },
        { status: 400 }
      );
    }

    try {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          name: name.trim(),
          phone: phone.trim(),
          pendingCredit: (initialCredit || 0).toString(),
        })
        .returning();

      return NextResponse.json(newCustomer);
    } catch {
      // Offline fallback
      const newCust = {
        id: `cust-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        pendingCredit: parseFloat(initialCredit) || 0,
        updatedAt: new Date().toISOString(),
      };
      offlineStore.customers.unshift(newCust);
      return NextResponse.json(newCust);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
