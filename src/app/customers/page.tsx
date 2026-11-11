"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, Search, RefreshCw, Banknote, Check } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function CustomersKhataPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [initialCredit, setInitialCredit] = useState("0");

  // Payment Collection Modal State
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "BANK" | "ONLINE">("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          initialCredit: parseFloat(initialCredit) || 0,
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setName("");
        setPhone("");
        setInitialCredit("0");
        loadCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openPaymentModal = (cust: any) => {
    setSelectedCustomer(cust);
    setPayAmount("");
    setPayNotes("");
    setPayMethod("CASH");
    setIsPayOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !payAmount || parseFloat(payAmount) <= 0) return;

    setPaySubmitting(true);
    try {
      const res = await fetch("/api/customers/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          amount: parseFloat(payAmount),
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });

      if (res.ok) {
        setIsPayOpen(false);
        loadCustomers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record payment.");
      }
    } catch {
      alert("Error processing payment.");
    } finally {
      setPaySubmitting(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const totalOutstandingCredit = customers.reduce(
    (sum, c) => sum + Number(c.pendingCredit || 0),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto font-sans">
      <div className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-zinc-400" />
          <h1 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Customer Credit Accounts (Khata Ledger)
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-xs text-zinc-400">
            Total Outstanding Credit:{" "}
            <span className="font-mono font-semibold text-amber-400">
              {formatCurrency(totalOutstandingCredit)}
            </span>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name or phone..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded pl-7 pr-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2 border border-dashed border-zinc-800 rounded">
            <Users className="w-8 h-8 stroke-1 text-zinc-600" />
            <span className="text-zinc-400 font-medium">No customer accounts found</span>
            <span className="text-zinc-500 text-[11px]">Click "Add Account" to register regular patients for store credit.</span>
          </div>
        ) : (
          <div className="border border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-medium">
                  <th className="py-2 px-3">Patient / Account Name</th>
                  <th className="py-2 px-3">Phone Number</th>
                  <th className="py-2 px-3 text-right">Outstanding Credit</th>
                  <th className="py-2 px-3">Last Activity</th>
                  <th className="py-2 px-3 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filtered.map((c) => {
                  const credit = Number(c.pendingCredit || 0);
                  return (
                    <tr key={c.id} className="hover:bg-zinc-900/40">
                      <td className="py-2 px-3 font-medium text-zinc-100">
                        {c.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-zinc-400">
                        {c.phone}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium">
                        <span className={credit > 0 ? "text-amber-400" : "text-zinc-400"}>
                          {formatCurrency(credit)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-zinc-500 font-mono text-[11px]">
                        {formatDate(c.updatedAt)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => openPaymentModal(c)}
                          className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 text-[11px] font-medium flex items-center gap-1 mx-auto transition-colors"
                          title="Receive Payment against Khata debt"
                        >
                          <Banknote className="w-3 h-3 text-emerald-400" />
                          <span>Receive</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-sm w-full p-5 space-y-3.5 text-xs shadow-xl">
            <h3 className="font-semibold text-sm text-zinc-100">Add Customer Account</h3>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Customer / Patient Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Starting Credit Balance (PKR)</label>
                <input
                  type="number"
                  value={initialCredit}
                  onChange={(e) => setInitialCredit(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Khata Payment Modal */}
      {isPayOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-sm w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="border-b border-zinc-800 pb-2">
              <h3 className="font-semibold text-sm text-zinc-100">Receive Customer Payment</h3>
              <p className="text-[11px] text-zinc-400">Account: <span className="text-zinc-200 font-medium">{selectedCustomer.name}</span> ({selectedCustomer.phone})</p>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded flex justify-between items-center">
              <span className="text-zinc-400">Current Outstanding Debt:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {formatCurrency(selectedCustomer.pendingCredit)}
              </span>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Amount Received (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  max={selectedCustomer.pendingCredit || undefined}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e: any) => setPayMethod(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-zinc-100"
                >
                  <option value="CASH">CASH (Registers into Drawer)</option>
                  <option value="BANK">BANK TRANSFER / RAAST</option>
                  <option value="ONLINE">ONLINE WALLET (JazzCash / EasyPaisa)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes / Slip # (Optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid in cash by patient"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded disabled:opacity-50"
                >
                  {paySubmitting ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
