"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DesktopTitlebar } from "@/components/desktop/titlebar";
import { Sidebar } from "@/components/layout/sidebar";
import { AIAssistantModal } from "@/components/ai/ai-assistant-modal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  const [user, setUser] = useState<{
    name: string;
    role: "ADMIN" | "CASHIER";
  } | null>(null);
  const [isAIOpen, setIsAIOpen] = useState(false);

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

  useEffect(() => {
    if (!isLoginPage) {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.authenticated && data?.user) {
            setUser({
              name: data.user.name,
              role: data.user.role,
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
      {/* 1. Professional Windows Desktop Titlebar */}
      <DesktopTitlebar
        user={user}
        onToggleAI={() => setIsAIOpen(!isAIOpen)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Clean Enterprise Sidebar */}
        <Sidebar
          userRole={user?.role || "ADMIN"}
          onOpenAI={() => setIsAIOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-zinc-900/40">
          {children}
        </main>
      </div>

      {/* 3. Non-intrusive AI Slide-out Drawer */}
      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        userRole={user?.role || "ADMIN"}
      />
    </div>
  );
}
