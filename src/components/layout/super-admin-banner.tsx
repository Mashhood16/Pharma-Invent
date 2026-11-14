"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeftRight, Building, Check, ChevronDown, LogOut } from "lucide-react";

interface SuperAdminBannerProps {
  currentPharmacyId?: string | null;
  currentPharmacyName?: string | null;
  currentPharmacyDsl?: string | null;
}

export function SuperAdminBanner({
  currentPharmacyId,
  currentPharmacyName,
  currentPharmacyDsl,
}: SuperAdminBannerProps) {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/super-admin/pharmacies")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.pharmacies) {
          setPharmacies(data.pharmacies);
        }
      })
      .catch(() => {});
  }, []);

  const handleSwitch = async (pharmacyId: string) => {
    if (pharmacyId === currentPharmacyId) {
      setIsOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await fetch("/api/super-admin/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId }),
      });
      if (res.ok) {
        setIsOpen(false);
        router.refresh();
        window.location.reload();
      }
    } catch {
      alert("Failed to switch pharmacy context.");
    } finally {
      setSwitching(false);
    }
  };

  const handleExitToPortal = async () => {
    try {
      await fetch("/api/super-admin/exit-tenant", { method: "POST" });
      router.push("/super-admin");
      router.refresh();
    } catch {
      router.push("/super-admin");
    }
  };

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-1 flex items-center justify-between text-xs text-amber-200 shrink-0 z-40 select-none">
      <div className="flex items-center space-x-2">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[10px] uppercase tracking-wider border border-amber-500/30">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          Super Admin Mode
        </span>

        <span className="text-zinc-400 hidden sm:inline text-[11px]">
          Currently Inspecting Store:
        </span>

        <span className="font-semibold text-zinc-100 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-700/60 font-mono text-[11px] flex items-center gap-1.5">
          <Building className="w-3 h-3 text-amber-400" />
          {currentPharmacyName || "Default Pharmacy"}
          {currentPharmacyDsl && (
            <span className="text-zinc-500 text-[10px] hidden md:inline">
              ({currentPharmacyDsl})
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        {/* Switch Pharmacy Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={switching}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-[11px] font-medium text-zinc-200 transition-colors shadow-sm"
          >
            <ArrowLeftRight className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Switch Store</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 z-50 divide-y divide-zinc-800 text-xs">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Select Pharmacy to Inspect
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/60">
                {pharmacies.map((p) => {
                  const isCurrent = p.id === currentPharmacyId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSwitch(p.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-zinc-800 transition-colors ${
                        isCurrent ? "bg-amber-500/10 text-amber-300 font-medium" : "text-zinc-300"
                      }`}
                    >
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate">{p.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{p.dslNumber}</div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Exit to Super Admin Portal */}
        <button
          onClick={handleExitToPortal}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-semibold text-amber-200 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          <span>Exit to Portal</span>
        </button>
      </div>
    </div>
  );
}
