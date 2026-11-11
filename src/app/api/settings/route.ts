import { NextResponse } from "next/server";
import { getPharmacySettings, savePharmacySettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const settings = getPharmacySettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const body = await request.json();
    const updated = savePharmacySettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
