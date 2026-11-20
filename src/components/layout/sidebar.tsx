"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Pill,
  CalendarX,
  TrendingUp,
  Truck,
  Users,
  Building2,
  LogOut,
  Bot,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { Role } from "@/lib/auth";

interface SidebarProps {
  userRole?: Role;
  onOpenAI?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  userRole = "ADMIN",
  onOpenAI,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    {
      label: "Super Admin Portal",
      href: "/super-admin",
      icon: ShieldCheck,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Point of Sale",
      href: "/pos",
      icon: ShoppingCart,
      shortcut: "F1",
      roles: ["SUPER_ADMIN", "ADMIN", "CASHIER"],
    },
    {
      label: "Medicine Inventory",
      href: "/inventory",
      icon: Pill,
      roles: ["SUPER_ADMIN", "ADMIN", "CASHIER"],
    },
    {
      label: "Stock In & Inflow",
      href: "/purchases",
      icon: Truck,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      label: "Expiry & RTV Returns",
      href: "/expiry",
      icon: CalendarX,
      roles: ["SUPER_ADMIN", "ADMIN", "CASHIER"],
    },
    {
      label: "Customer Accounts",
      href: "/customers",
      icon: Users,
      roles: ["SUPER_ADMIN", "ADMIN", "CASHIER"],
    },
    {
      label: "Suppliers & Vendors",
      href: "/suppliers",
      icon: Building2,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      label: "Financial Analytics",
      href: "/financials",
      icon: TrendingUp,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      label: "Store Settings",
      href: "/settings",
      icon: Settings,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
  ];

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const renderContent = (isMobile = false) => (
    <>
      <div className="py-2">
        <div className="px-3 py-1.5 flex items-center justify-between text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          <span>{userRole === "SUPER_ADMIN" ? "Platform & Store" : "Main Modules"}</span>
          {isMobile && onMobileClose && (
            <button
              onClick={onMobileClose}
              className="p-1 -mr-1 text-zinc-400 hover:text-zinc-100 rounded md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="space-y-0.5 px-2 mt-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const isSuperAdminLink = item.href === "/super-admin";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (isMobile && onMobileClose) onMobileClose();
                }}
                className={`flex items-center justify-between px-2.5 py-2.5 sm:py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? isSuperAdminLink
                      ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                      : "bg-zinc-800 text-white font-semibold"
                    : isSuperAdminLink
                    ? "text-amber-400/90 hover:bg-amber-500/10 hover:text-amber-300"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? isSuperAdminLink
                          ? "text-amber-400"
                          : "text-zinc-100"
                        : isSuperAdminLink
                        ? "text-amber-400"
                        : "text-zinc-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.shortcut && (
                  <kbd className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 rounded">
                    {item.shortcut}
                  </kbd>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User actions */}
      <div className="p-2 border-t border-zinc-800 space-y-1">
        <button
          onClick={() => {
            if (isMobile && onMobileClose) onMobileClose();
            if (onOpenAI) onOpenAI();
          }}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-zinc-500" />
            <span>AI Copilot</span>
          </div>
          <kbd className="hidden sm:inline-block text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 rounded">
            Ctrl+K
          </kbd>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 px-2.5 py-2 text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4 text-zinc-500" />
          <span>Exit Session</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="w-56 bg-zinc-950 border-r border-zinc-800 hidden md:flex flex-col justify-between shrink-0 select-none">
        {renderContent(false)}
      </aside>

      {/* 2. Mobile Slide-out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            onClick={onMobileClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative w-64 max-w-[80vw] bg-zinc-950 border-r border-zinc-800 z-10 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
