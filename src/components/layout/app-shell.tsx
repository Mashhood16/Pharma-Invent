"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DesktopTitlebar } from "@/components/desktop/titlebar";
import { Sidebar } from "@/components/layout/sidebar";
import { AIAssistantModal } from "@/components/ai/ai-assistant-modal";
import { SuperAdminBanner } from "@/components/layout/super-admin-banner";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Role } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isSuperAdminPortal = pathname === "/super-admin";

  const [user, setUser] = useState<{
    name: string;
    role: Role;
    pharmacyName?: string | null;
    activePharmacyId?: string | null;
    activePharmacyName?: string | null;
    activePharmacyDsl?: string | null;
  } | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Global hotkey Ctrl+K for AI Copilot
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsAIOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoginPage) {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.authenticated && data?.user) {
            setUser({
              name: data.user.name,
              role: data.user.role,
              pharmacyName: data.user.pharmacyName,
              activePharmacyId: data.user.activePharmacyId,
              activePharmacyName: data.user.activePharmacyName,
              activePharmacyDsl: data.user.activePharmacyDsl,
            });
          }
        })
        .catch(() => {});
    }
  }, [pathname, isLoginPage]);

  if (isLoginPage) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
        <DesktopTitlebar user={null} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans select-none">
      {/* 1. Responsive Titlebar */}
      <DesktopTitlebar
        user={user}
        onToggleAI={() => setIsAIOpen(!isAIOpen)}
        onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* 2. Super Admin Tenant Inspection Banner */}
      {user?.role === "SUPER_ADMIN" && !isSuperAdminPortal && (
        <SuperAdminBanner
          currentPharmacyId={user.activePharmacyId}
          currentPharmacyName={user.activePharmacyName}
          currentPharmacyDsl={user.activePharmacyDsl}
        />
      )}

      {/* 3. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Responsive Desktop & Mobile Slide-out Drawer Sidebar */}
        <Sidebar
          userRole={user?.role || "ADMIN"}
          onOpenAI={() => setIsAIOpen(true)}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-zinc-900/40">
          {children}
        </main>
      </div>

      {/* 4. Mobile Bottom Navigation Bar (Phone only) */}
      <MobileBottomNav
        userRole={user?.role || "ADMIN"}
        onOpenMenu={() => setMobileSidebarOpen(true)}
      />

      {/* 5. Non-intrusive AI Slide-out Drawer */}
      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        userRole={user?.role === "SUPER_ADMIN" ? "ADMIN" : user?.role || "ADMIN"}
      />
    </div>
  );
}
