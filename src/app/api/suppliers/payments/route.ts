import { NextResponse } from "next/server";
import { offlineStore } from "@/db/offline-store";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    let payments = offlineStore.supplierPayments;
    if (supplierId) {
      payments = payments.filter((p) => p.supplierId === supplierId);
    }
    return NextResponse.json(payments);
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
    const { supplierId, amount, paymentMethod, notes } = body;

    if (!supplierId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Supplier ID and a valid payout amount are required" },
        { status: 400 }
      );
    }

    const payment = offlineStore.recordSupplierPayment({
      supplierId,
      amount: Number(amount),
      paymentMethod: paymentMethod || "CASH",
      notes: notes || "",
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
