import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let activePharmacy = null;
  if (user.role === "SUPER_ADMIN") {
    const cookieStore = await cookies();
    const activeId = cookieStore.get("pharma_active_tenant")?.value;
    if (activeId) {
      activePharmacy = offlineStore.getPharmacy(activeId);
    }
  } else if (user.pharmacyId) {
    activePharmacy = offlineStore.getPharmacy(user.pharmacyId);
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
