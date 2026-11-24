import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";
import { db, isDbConfigured } from "@/db";
import { pharmacies, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    if (isDbConfigured) {
      try {
        const dbPharmacies = await db.select().from(pharmacies);
        for (const dp of dbPharmacies) {
          const existing = offlineStore.pharmacies.find((p) => p.id === dp.id);
          if (!existing) {
            offlineStore.pharmacies.push({
              id: dp.id,
              name: dp.name,
              dslNumber: dp.dslNumber,
              ntn: dp.ntn || "",
              ownerName: dp.ownerName,
              phone: dp.phone,
              address: dp.address,
              status: dp.status as "ACTIVE" | "SUSPENDED",
              createdAt: dp.createdAt.toISOString(),
              updatedAt: dp.updatedAt.toISOString(),
            });
          } else {
            existing.status = dp.status as "ACTIVE" | "SUSPENDED";
            existing.name = dp.name;
          }
        }
      } catch (err) {
        console.warn("Could not sync Postgres pharmacies to memory:", err);
      }
    }

    const pharmaciesList = offlineStore.getPharmaciesWithStats();
    const globalStats = offlineStore.getGlobalPlatformStats();

    return NextResponse.json({
      pharmacies: pharmaciesList,
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

    if (isDbConfigured) {
      try {
        const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
        const [dbPharm] = await db
          .insert(pharmacies)
          .values({
            name: name.trim(),
            dslNumber: dslNumber.trim(),
            ntn: ntn?.trim() || null,
            ownerName: ownerName.trim(),
            phone: phone.trim(),
            address: address?.trim() || "Main Market, Pakistan",
            status: "ACTIVE",
          })
          .returning();

        await db.insert(users).values({
          name: `${ownerName.trim()} (Head Pharmacist)`,
          username: adminUsername.trim().toLowerCase(),
          role: "ADMIN",
          passwordHash: adminPasswordHash,
          pharmacyId: dbPharm.id,
        });

        // Align local store id with Postgres primary key
        result.pharmacy.id = dbPharm.id;
        result.adminUser.pharmacyId = dbPharm.id;
      } catch (dbErr) {
        console.warn("Could not insert pharmacy to Postgres:", dbErr);
      }
    }

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

      if (isDbConfigured) {
        try {
          await db
            .update(pharmacies)
            .set({ status: updated.status })
            .where(eq(pharmacies.id, id));
        } catch {}
      }

      return NextResponse.json({
        success: true,
        message: `Pharmacy status updated to ${updated.status}`,
        pharmacy: updated,
      });
    }

    const updated = offlineStore.updatePharmacy(id, updates);

    if (isDbConfigured) {
      try {
        await db
          .update(pharmacies)
          .set(updates)
          .where(eq(pharmacies.id, id));
      } catch {}
    }

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

    if (isDbConfigured) {
      try {
        await db.delete(pharmacies).where(eq(pharmacies.id, id));
      } catch {}
    }

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
