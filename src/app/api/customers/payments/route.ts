import { NextResponse } from "next/server";
import { offlineStore } from "@/db/offline-store";
import { resolveTenant } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const tenantRes = await resolveTenant();
    if (!tenantRes.success) {
      return NextResponse.json({ error: tenantRes.error }, { status: tenantRes.status });
    }
    const { pharmacyId } = tenantRes.tenant;

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    let payments = offlineStore.getCustomerPayments(pharmacyId);
    if (customerId) {
      payments = payments.filter((p) => p.customerId === customerId);
    }
    return NextResponse.json(payments);
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
    const { pharmacyId } = tenantRes.tenant;

    const body = await request.json();
    const { customerId, amount, paymentMethod, notes } = body;

    if (!customerId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Customer ID and a valid payment amount are required" },
        { status: 400 }
      );
    }

    const payment = offlineStore.recordCustomerPayment(pharmacyId, {
      customerId,
      amount: Number(amount),
      paymentMethod: paymentMethod || "CASH",
      notes: notes || "",
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
