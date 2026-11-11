import { NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";

export async function GET() {
  try {
    try {
      const list = await db.query.suppliers.findMany({
        orderBy: [desc(suppliers.updatedAt)],
        with: {
          batches: true,
          purchases: true,
        },
      });
      return NextResponse.json(list);
    } catch {
      // Offline fallback
      return NextResponse.json(offlineStore.suppliers);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, contactInfo, ledgerBalance } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    try {
      const [newSupplier] = await db
        .insert(suppliers)
        .values({
          name: name.trim(),
          contactInfo: contactInfo?.trim() || "",
          ledgerBalance: (ledgerBalance || 0).toString(),
        })
        .returning();

      return NextResponse.json(newSupplier);
    } catch {
      // Offline fallback
      const newSup = {
        id: `sup-${Date.now()}`,
        name: name.trim(),
        contactInfo: contactInfo?.trim() || "",
        ledgerBalance: parseFloat(ledgerBalance) || 0,
      };
      offlineStore.suppliers.push(newSup);
      return NextResponse.json(newSup);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
