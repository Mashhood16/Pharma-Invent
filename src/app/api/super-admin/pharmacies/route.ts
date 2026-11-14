import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    const pharmacies = offlineStore.getPharmaciesWithStats();
    const globalStats = offlineStore.getGlobalPlatformStats();

    return NextResponse.json({
      pharmacies,
      globalStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, dslNumber, ntn, ownerName, phone, address, adminUsername, adminPassword } = body;

    if (!name || !dslNumber || !ownerName || !phone || !adminUsername || !adminPassword) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, dslNumber, ownerName, phone, adminUsername, adminPassword.",
        },
        { status: 400 }
      );
    }

    const result = offlineStore.createPharmacy({
      name,
      dslNumber,
      ntn,
      ownerName,
      phone,
      address: address || "Main Market, Pakistan",
      adminUsername,
      adminPassword,
    });

    return NextResponse.json({
      success: true,
      message: `Pharmacy "${name}" created successfully.`,
      pharmacy: result.pharmacy,
      adminUsername: result.adminUser.username,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Pharmacy ID is required." }, { status: 400 });
    }

    if (action === "toggle-status") {
      const updated = offlineStore.togglePharmacyStatus(id);
      return NextResponse.json({
        success: true,
        message: `Pharmacy status updated to ${updated.status}`,
        pharmacy: updated,
      });
    }

    const updated = offlineStore.updatePharmacy(id, updates);
    return NextResponse.json({
      success: true,
      message: "Pharmacy updated successfully.",
      pharmacy: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Pharmacy ID is required." }, { status: 400 });
    }

    const success = offlineStore.deletePharmacy(id);
    if (!success) {
      return NextResponse.json({ error: "Pharmacy not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Pharmacy and all associated stock/sales data deleted permanently.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
