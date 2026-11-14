import { NextResponse } from "next/server";
import { offlineStore } from "@/db/offline-store";
import { resolveTenant } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId, user } = tenantRes.tenant;

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;

    const report = offlineStore.getDayEndClosing(pharmacyId, date);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
