import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.delete("pharma_active_tenant");

    return NextResponse.json({
      success: true,
      message: "Exited tenant inspection mode. Returned to Super Admin Portal.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
