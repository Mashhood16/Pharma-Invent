import { cookies } from "next/headers";
import { getCurrentUser, SessionPayload } from "@/lib/auth";
import { offlineStore, OfflinePharmacy } from "@/db/offline-store";
import { db, isDbConfigured } from "@/db";
import { pharmacies, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface ResolvedTenant {
  user: SessionPayload;
  pharmacyId: string;
  pharmacy: OfflinePharmacy;
  isSuperAdmin: boolean;
}

async function getPharmacyRecord(pharmacyId: string): Promise<OfflinePharmacy | null> {
  if (isDbConfigured) {
    try {
      const [dbPharm] = await db
        .select()
        .from(pharmacies)
        .where(eq(pharmacies.id, pharmacyId))
        .limit(1);

      if (dbPharm) {
        return {
          id: dbPharm.id,
          name: dbPharm.name,
          dslNumber: dbPharm.dslNumber,
          ntn: dbPharm.ntn || undefined,
          ownerName: dbPharm.ownerName,
          phone: dbPharm.phone,
          address: dbPharm.address,
          status: dbPharm.status as "ACTIVE" | "SUSPENDED",
          createdAt: dbPharm.createdAt.toISOString(),
          updatedAt: dbPharm.updatedAt.toISOString(),
        };
      }
    } catch (err) {
      console.warn("Could not query pharmacy from Postgres:", err);
    }
  }

  const localPharm = offlineStore.getPharmacy(pharmacyId);
  return localPharm || null;
}

export async function resolveTenant(): Promise<
  | { success: true; tenant: ResolvedTenant }
  | { success: false; error: string; status: number }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in.", status: 401 };
  }

  // 1. If Super Admin
  if (user.role === "SUPER_ADMIN") {
    const cookieStore = await cookies();
    const activeTenantId = cookieStore.get("pharma_active_tenant")?.value;

    let targetPharmacyId = activeTenantId;

    // If no tenant selected yet, check if any pharmacy exists and default to the first one
    if (!targetPharmacyId) {
      if (isDbConfigured) {
        try {
          const [firstDbPharm] = await db
            .select()
            .from(pharmacies)
            .limit(1);
          if (firstDbPharm) {
            targetPharmacyId = firstDbPharm.id;
          }
        } catch {}
      }

      if (!targetPharmacyId) {
        const firstPharm = offlineStore.pharmacies[0];
        if (firstPharm) {
          targetPharmacyId = firstPharm.id;
        } else {
          return {
            success: false,
            error: "No pharmacy accounts registered yet. Please create a pharmacy from the Super Admin Portal.",
            status: 400,
          };
        }
      }
    }

    const pharmacy = await getPharmacyRecord(targetPharmacyId);
    if (!pharmacy) {
      return {
        success: false,
        error: `Selected pharmacy (${targetPharmacyId}) not found.`,
        status: 404,
      };
    }

    return {
      success: true,
      tenant: {
        user,
        pharmacyId: targetPharmacyId,
        pharmacy,
        isSuperAdmin: true,
      },
    };
  }

  // 2. If Pharmacy User (ADMIN or CASHIER)
  let effectivePharmacyId = user.pharmacyId;

  // Auto-heal if session token has pharmacyId === null (e.g. legacy/old token or unassigned admin)
  if (!effectivePharmacyId) {
    if (isDbConfigured) {
      try {
        const [firstPharm] = await db
          .select()
          .from(pharmacies)
          .where(eq(pharmacies.status, "ACTIVE"))
          .limit(1);
        if (firstPharm) {
          effectivePharmacyId = firstPharm.id;
          await db
            .update(users)
            .set({ pharmacyId: firstPharm.id })
            .where(eq(users.id, user.userId))
            .catch(() => {});
        }
      } catch {}
    }

    if (!effectivePharmacyId) {
      const firstLocal =
        offlineStore.pharmacies.find((p) => p.status === "ACTIVE") ||
        offlineStore.pharmacies[0];
      if (firstLocal) {
        effectivePharmacyId = firstLocal.id;
      }
    }
  }

  if (!effectivePharmacyId) {
    return {
      success: false,
      error: "User is not linked to any pharmacy account.",
      status: 403,
    };
  }

  const pharmacy = await getPharmacyRecord(effectivePharmacyId);
  if (!pharmacy) {
    return {
      success: false,
      error: "Pharmacy account not found or has been removed.",
      status: 404,
    };
  }

  if (pharmacy.status === "SUSPENDED") {
    return {
      success: false,
      error: "This pharmacy account is currently suspended. Please contact the system administrator.",
      status: 403,
    };
  }

  return {
    success: true,
    tenant: {
      user,
      pharmacyId: effectivePharmacyId,
      pharmacy,
      isSuperAdmin: false,
    },
  };
}
