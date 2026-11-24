import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";
import { db, isDbConfigured } from "@/db";
import { pharmacies } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let activePharmacy: any = null;
  const cookieStore = await cookies();
  const activeId = cookieStore.get("pharma_active_tenant")?.value;
  const targetId = user.role === "SUPER_ADMIN" ? activeId : user.pharmacyId;

  if (targetId) {
    if (isDbConfigured) {
      try {
        const [dbPharm] = await db
          .select()
          .from(pharmacies)
          .where(eq(pharmacies.id, targetId))
          .limit(1);
        if (dbPharm) {
          activePharmacy = dbPharm;
        }
      } catch {}
    }
    if (!activePharmacy) {
      activePharmacy = offlineStore.getPharmacy(targetId);
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      pharmacyName: activePharmacy?.name || user.pharmacyName || null,
      activePharmacyId: activePharmacy?.id || null,
      activePharmacyName: activePharmacy?.name || null,
      activePharmacyDsl: activePharmacy?.dslNumber || null,
    },
  });
}
