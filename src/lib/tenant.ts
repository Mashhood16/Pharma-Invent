import { cookies } from "next/headers";
import { getCurrentUser, SessionPayload } from "@/lib/auth";
import { offlineStore, OfflinePharmacy } from "@/db/offline-store";

export interface ResolvedTenant {
  user: SessionPayload;
  pharmacyId: string;
  pharmacy: OfflinePharmacy;
  isSuperAdmin: boolean;
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

    // If no tenant selected yet, check if any pharmacy exists and default to the first one, or allow inspection
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

    const pharmacy = offlineStore.getPharmacy(targetPharmacyId);
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
  if (!user.pharmacyId) {
    return {
      success: false,
      error: "User is not linked to any pharmacy account.",
      status: 403,
    };
  }

  const pharmacy = offlineStore.getPharmacy(user.pharmacyId);
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
      pharmacyId: user.pharmacyId,
      pharmacy,
      isSuperAdmin: false,
    },
  };
}
