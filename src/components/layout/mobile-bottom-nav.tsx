"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Pill,
  Users,
  TrendingUp,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { Role } from "@/lib/auth";

interface MobileBottomNavProps {
  userRole?: Role;
  onOpenMenu: () => void;
}

export function MobileBottomNav({ userRole = "ADMIN", onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const primaryItems = isSuperAdmin
    ? [
        { label: "Portal", href: "/super-admin", icon: ShieldCheck },
        { label: "POS", href: "/pos", icon: ShoppingCart },
        { label: "Stock", href: "/inventory", icon: Pill },
        { label: "Accounts", href: "/customers", icon: Users },
      ]
    : [
        { label: "POS", href: "/pos", icon: ShoppingCart },
        { label: "Inventory", href: "/inventory", icon: Pill },
        { label: "Khata", href: "/customers", icon: Users },
        { label: "Reports", href: "/financials", icon: TrendingUp },
      ];

  return (
    <nav className="md:hidden h-14 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-md flex items-center justify-around px-2 z-40 shrink-0 select-none pb-safe">
      {primaryItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
              isActive
                ? "text-zinc-100 font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div
              className={`p-1 rounded-md transition-colors ${
                isActive ? "bg-zinc-800 text-amber-400" : "text-zinc-400"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="mt-0.5 tracking-tight">{item.label}</span>
          </Link>
        );
      })}

      {/* Menu / Drawer Button */}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <div className="p-1 rounded-md text-zinc-400">
          <Menu className="w-4 h-4" />
        </div>
        <span className="mt-0.5 tracking-tight">More</span>
      </button>
    </nav>
  );
}
