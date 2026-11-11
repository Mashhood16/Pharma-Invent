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
} from "lucide-react";

interface SidebarProps {
  userRole?: "ADMIN" | "CASHIER";
  onOpenAI?: () => void;
}

export function Sidebar({
  userRole = "ADMIN",
  onOpenAI,
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
      label: "Point of Sale",
      href: "/pos",
      icon: ShoppingCart,
      shortcut: "F1",
      roles: ["ADMIN", "CASHIER"],
    },
    {
      label: "Medicine Inventory",
      href: "/inventory",
      icon: Pill,
      roles: ["ADMIN", "CASHIER"],
    },
    {
      label: "Stock In & Inflow",
      href: "/purchases",
      icon: Truck,
      roles: ["ADMIN"],
    },
    {
      label: "Expiry & RTV Returns",
      href: "/expiry",
      icon: CalendarX,
      roles: ["ADMIN", "CASHIER"],
    },
    {
      label: "Customer Accounts",
      href: "/customers",
      icon: Users,
      roles: ["ADMIN", "CASHIER"],
    },
    {
      label: "Suppliers & Vendors",
      href: "/suppliers",
      icon: Building2,
      roles: ["ADMIN"],
    },
    {
      label: "Financial Analytics",
      href: "/financials",
      icon: TrendingUp,
      roles: ["ADMIN"],
    },
    {
      label: "Store Settings",
      href: "/settings",
      icon: Settings,
      roles: ["ADMIN"],
    },
  ];

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between shrink-0 select-none">
      <div className="py-2">
        <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          Main Modules
        </div>

        <nav className="space-y-0.5 px-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 ${isActive ? "text-zinc-100" : "text-zinc-500"}`} />
                  <span>{item.label}</span>
                </div>

                {item.shortcut && (
                  <kbd className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 rounded">
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
          onClick={onOpenAI}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-zinc-500" />
            <span>AI Copilot</span>
          </div>
          <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 rounded">
            Ctrl+K
          </kbd>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4 text-zinc-500" />
          <span>Exit Session</span>
        </button>
      </div>
    </aside>
  );
}
