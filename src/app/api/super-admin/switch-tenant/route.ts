import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    const { pharmacyId } = await request.json();
    if (!pharmacyId) {
      return NextResponse.json({ error: "Pharmacy ID is required." }, { status: 400 });
    }

    const pharmacy = offlineStore.getPharmacy(pharmacyId);
    if (!pharmacy) {
      return NextResponse.json({ error: "Pharmacy not found." }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set("pharma_active_tenant", pharmacyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({
      success: true,
      message: `Switched context to ${pharmacy.name}`,
      pharmacy,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
