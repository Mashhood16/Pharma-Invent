import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { users, pharmacies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSessionToken, setAuthCookie } from "@/lib/auth";
import { offlineStore } from "@/db/offline-store";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // 1. Try PostgreSQL Database if explicitly configured
    if (isDbConfigured) {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, cleanUsername))
          .limit(1);

        if (user) {
          const isValid = await verifyPassword(password, user.passwordHash);
          if (isValid) {
            let activePharmacyId = user.pharmacyId;
            let pharmacyName: string | null = null;

            if (user.role !== "SUPER_ADMIN") {
              // If user has no pharmacyId (e.g. legacy/old user), auto-link to first active pharmacy
              if (!activePharmacyId) {
                const [firstPharm] = await db
                  .select()
                  .from(pharmacies)
                  .where(eq(pharmacies.status, "ACTIVE"))
                  .limit(1);
                if (firstPharm) {
                  activePharmacyId = firstPharm.id;
                  pharmacyName = firstPharm.name;
                  await db
                    .update(users)
                    .set({ pharmacyId: firstPharm.id })
                    .where(eq(users.id, user.id))
                    .catch(() => {});
                }
              } else {
                const [pharm] = await db
                  .select()
                  .from(pharmacies)
                  .where(eq(pharmacies.id, activePharmacyId))
                  .limit(1);
                if (pharm) {
                  if (pharm.status === "SUSPENDED") {
                    return NextResponse.json(
                      {
                        error:
                          "This pharmacy account is currently suspended. Please contact the platform Super Admin.",
                      },
                      { status: 403 }
                    );
                  }
                  pharmacyName = pharm.name;
                }
              }
            }

            const token = await createSessionToken({
              userId: user.id,
              name: user.name,
              username: user.username,
              role: user.role as any,
              pharmacyId: activePharmacyId,
              pharmacyName: pharmacyName,
            });
            await setAuthCookie(token);

            const redirectTo = user.role === "SUPER_ADMIN" ? "/super-admin" : "/pos";

            return NextResponse.json({
              success: true,
              user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                pharmacyId: activePharmacyId,
                pharmacyName: pharmacyName,
              },
              redirectTo,
            });
          }
        }
      } catch (err) {
        console.warn("Postgres authentication failed, falling back to standalone store:", err);
      }
    }

    // 2. Multi-Tenant Offline / Standalone Store Check
    const localUser = offlineStore.users.find(
      (u) => u.username.toLowerCase() === cleanUsername
    );

    if (localUser) {
      // Support plaintext or bcrypt hash
      let isValid = false;
      if (localUser.passwordHash.startsWith("$2a$") || localUser.passwordHash.startsWith("$2b$")) {
        isValid = await verifyPassword(password, localUser.passwordHash);
      } else {
        isValid = password === localUser.passwordHash;
      }

      if (isValid) {
        // If tenant user, verify pharmacy is active
        let pharmName: string | null = null;
        if (localUser.pharmacyId) {
          const pharm = offlineStore.getPharmacy(localUser.pharmacyId);
          if (!pharm) {
            return NextResponse.json(
              { error: "Pharmacy account does not exist or has been deleted." },
              { status: 403 }
            );
          }
          if (pharm.status === "SUSPENDED") {
            return NextResponse.json(
              {
                error:
                  "This pharmacy account is currently suspended. Please contact the platform Super Admin.",
              },
              { status: 403 }
            );
          }
          pharmName = pharm.name;
        }

        const token = await createSessionToken({
          userId: localUser.id,
          name: localUser.name,
          username: localUser.username,
          role: localUser.role,
          pharmacyId: localUser.pharmacyId,
          pharmacyName: pharmName,
        });

        await setAuthCookie(token);

        const redirectTo = localUser.role === "SUPER_ADMIN" ? "/super-admin" : "/pos";

        return NextResponse.json({
          success: true,
          user: {
            id: localUser.id,
            name: localUser.name,
            username: localUser.username,
            role: localUser.role,
            pharmacyId: localUser.pharmacyId,
            pharmacyName: pharmName,
          },
          redirectTo,
        });
      }
    }

    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}
