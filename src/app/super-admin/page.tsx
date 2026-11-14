"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Plus,
  Search,
  ExternalLink,
  Power,
  Trash2,
  Phone,
  MapPin,
  RefreshCw,
  TrendingUp,
  Package,
  Store,
  X,
  FileCheck,
  UserCheck,
  Lock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function SuperAdminPage() {
  const router = useRouter();
  const [data, setData] = useState<{
    pharmacies: any[];
    globalStats: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Pharmacy Form
  const [form, setForm] = useState({
    name: "",
    dslNumber: "",
    ntn: "",
    ownerName: "",
    phone: "",
    address: "",
    adminUsername: "",
    adminPassword: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/pharmacies");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 403) {
        router.push("/pos?error=unauthorized");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenStore = async (pharmacyId: string) => {
    try {
      const res = await fetch("/api/super-admin/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId }),
      });
      if (res.ok) {
        router.push("/inventory");
        router.refresh();
      } else {
        alert("Unable to switch pharmacy context.");
      }
    } catch {
      alert("Error switching pharmacy context.");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPEND" : "ACTIVATE";
    if (!confirm(`Are you sure you want to ${nextStatus} this pharmacy?`)) return;

    try {
      const res = await fetch("/api/super-admin/pharmacies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggle-status" }),
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      alert("Error updating pharmacy status.");
    }
  };

  const handleDeletePharmacy = async (id: string, name: string) => {
    if (
      !confirm(
        `DANGER: Are you sure you want to permanently delete "${name}"?\n\nThis will remove all associated medicines, inventory stock, sales records, and khata accounts for this pharmacy. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/super-admin/pharmacies?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to delete pharmacy.");
      }
    } catch {
      alert("Error deleting pharmacy.");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreating(true);

    try {
      const res = await fetch("/api/super-admin/pharmacies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (res.ok) {
        setIsCreateModalOpen(false);
        setForm({
          name: "",
          dslNumber: "",
          ntn: "",
          ownerName: "",
          phone: "",
          address: "",
          adminUsername: "",
          adminPassword: "",
        });
        loadData();
      } else {
        setErrorMsg(json.error || "Failed to create pharmacy account.");
      }
    } catch {
      setErrorMsg("Network error creating pharmacy account.");
    } finally {
      setCreating(false);
    }
  };

  const filteredPharmacies = data?.pharmacies.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.dslNumber.toLowerCase().includes(q) ||
      p.ownerName.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  const stats = data?.globalStats || {
    totalPharmacies: 0,
    activePharmacies: 0,
    totalMedicinesCataloged: 0,
    totalSalesVolume: 0,
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto font-sans">
      {/* Top Banner */}
      <div className="h-14 bg-zinc-900 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              Super Admin Control Center
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Multi-Tenant Platform
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">
              Manage all client pharmacies, provision new stores, and inspect isolated tenant data.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Pharmacy</span>
          </button>

          <button
            onClick={loadData}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Global Platform KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
              <span>Total Pharmacies</span>
              <Store className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {stats.totalPharmacies}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium">
              {stats.activePharmacies} Active Stores
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
              <span>Total Cataloged Medicines</span>
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {stats.totalMedicinesCataloged}
            </div>
            <div className="text-[11px] text-zinc-500">Across all tenant catalogs</div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
              <span>Platform Sales Volume</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {formatCurrency(stats.totalSalesVolume)}
            </div>
            <div className="text-[11px] text-zinc-500">Gross revenue generated</div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex justify-between items-center text-xs text-zinc-400 font-medium">
              <span>Platform Security</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base font-semibold text-emerald-400 pt-1">
              Strict Tenant Isolation
            </div>
            <div className="text-[11px] text-zinc-500">Zero cross-store data leakage</div>
          </div>
        </div>

        {/* Search & Directory Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pharmacy, DSL #, owner, city..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="text-xs text-zinc-400">
            Showing <span className="font-semibold text-zinc-200">{filteredPharmacies?.length || 0}</span> registered pharmacy store(s)
          </div>
        </div>

        {/* Pharmacies Directory Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPharmacies?.length === 0 ? (
            <div className="col-span-full py-16 text-center text-zinc-500 border border-zinc-800 border-dashed rounded-lg">
              <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No pharmacies matched your search.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium"
              >
                + Register First Pharmacy
              </button>
            </div>
          ) : (
            filteredPharmacies?.map((pharm) => (
              <div
                key={pharm.id}
                className={`bg-zinc-900 border rounded-lg p-5 flex flex-col justify-between space-y-4 transition-all shadow-sm ${
                  pharm.status === "ACTIVE"
                    ? "border-zinc-800 hover:border-zinc-700"
                    : "border-red-950/60 bg-red-950/10 opacity-75"
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">{pharm.name}</span>
                      </h3>
                      <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                        DSL: <span className="text-zinc-200">{pharm.dslNumber}</span>
                        {pharm.ntn && (
                          <span className="text-zinc-500 ml-2">NTN: {pharm.ntn}</span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        pharm.status === "ACTIVE"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                          : "bg-red-950 text-red-400 border border-red-800/60"
                      }`}
                    >
                      {pharm.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-3 space-y-1 text-xs text-zinc-400 border-t border-zinc-800/80 pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-zinc-500" />
                      <span>
                        In-charge: <strong className="text-zinc-200">{pharm.ownerName}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{pharm.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{pharm.address}</span>
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  <div className="mt-3 grid grid-cols-3 gap-2 bg-zinc-950/60 p-2 rounded border border-zinc-800/60 text-center">
                    <div>
                      <div className="text-[10px] text-zinc-500">Medicines</div>
                      <div className="font-mono text-xs font-semibold text-zinc-200">
                        {pharm.totalMedicines}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">Sales Orders</div>
                      <div className="font-mono text-xs font-semibold text-zinc-200">
                        {pharm.totalSalesCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500">Revenue</div>
                      <div className="font-mono text-xs font-semibold text-emerald-400 truncate">
                        {formatCurrency(pharm.totalRevenue)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenStore(pharm.id)}
                    className="flex-1 py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs rounded flex items-center justify-center gap-1.5 transition-colors border border-zinc-700 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open / Inspect Store</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(pharm.id, pharm.status)}
                    className={`p-1.5 rounded border text-xs transition-colors ${
                      pharm.status === "ACTIVE"
                        ? "border-zinc-800 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800"
                        : "border-red-800 text-red-400 hover:bg-red-950/40"
                    }`}
                    title={pharm.status === "ACTIVE" ? "Suspend Store" : "Activate Store"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeletePharmacy(pharm.id, pharm.name)}
                    className="p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Delete Pharmacy Permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Register Pharmacy Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-400" />
                  Register New Pharmacy Store
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Provision an isolated tenant account with unique login credentials.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-red-950/40 border border-red-900 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Pharmacy Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Madina Medical Store"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Drug Sale License (DSL #) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DSL-092-2026"
                    value={form.dslNumber}
                    onChange={(e) => setForm({ ...form, dslNumber: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">NTN / Tax ID</label>
                  <input
                    type="text"
                    placeholder="e.g. NTN-9812-3"
                    value={form.ntn}
                    onChange={(e) => setForm({ ...form, ntn: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Owner / Pharmacist In-Charge *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Tariq Mahmood"
                    value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +92 321 9876543"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-zinc-400 mb-1 font-medium">Store Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shop 4, Hospital Road, Rawalpindi"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Pharmacy Admin Login Credentials
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">
                      Admin Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. almadina_admin"
                      value={form.adminUsername}
                      onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">
                      Admin Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating Account..." : "Create Pharmacy Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
