import { NextResponse } from "next/server";
import { offlineStore } from "@/db/offline-store";
import { resolveTenant } from "@/lib/tenant";

export async function GET() {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId } = tenantRes.tenant;

    const settings = offlineStore.getSettings(pharmacyId);
    return NextResponse.json(settings);
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
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const body = await request.json();
    const updated = offlineStore.saveSettings(pharmacyId, body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
