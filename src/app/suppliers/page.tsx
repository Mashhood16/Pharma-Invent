"use client";

import React, { useState, useEffect } from "react";
import { Building2, Plus, RefreshCw, Send, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");

  // Supplier Payout State
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "BANK" | "CHEQUE">("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contactInfo: contact,
          ledgerBalance: parseFloat(initialBalance) || 0,
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setName("");
        setContact("");
        setInitialBalance("0");
        loadSuppliers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openPaySupplierModal = (sup: any) => {
    setSelectedSupplier(sup);
    setPayAmount("");
    setPayNotes("");
    setPayMethod("CASH");
    setIsPayOpen(true);
  };

  const handlePaySupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !payAmount || parseFloat(payAmount) <= 0) return;

    setPaySubmitting(true);
    try {
      const res = await fetch("/api/suppliers/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier.id,
          amount: parseFloat(payAmount),
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      });

      if (res.ok) {
        setIsPayOpen(false);
        loadSuppliers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record supplier payment.");
      }
    } catch {
      alert("Error processing supplier payment.");
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto font-sans">
      <div className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-zinc-400" />
          <h1 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Suppliers & Vendor Accounts
          </h1>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Supplier</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {suppliers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2 border border-dashed border-zinc-800 rounded">
            <Building2 className="w-8 h-8 stroke-1 text-zinc-600" />
            <span className="text-zinc-400 font-medium">No suppliers registered yet</span>
            <span className="text-zinc-500 text-[11px]">Click "Add Supplier" to add wholesale pharmaceutical distributors.</span>
          </div>
        ) : (
          <div className="border border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-medium">
                  <th className="py-2 px-3">Supplier Name</th>
                  <th className="py-2 px-3">Contact & Representative</th>
                  <th className="py-2 px-3 text-right">Payable Balance</th>
                  <th className="py-2 px-3 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-zinc-900/40">
                    <td className="py-2 px-3 font-medium text-zinc-100">
                      {sup.name}
                    </td>
                    <td className="py-2 px-3 text-zinc-400">
                      {sup.contactInfo || "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-zinc-200">
                      {formatCurrency(sup.ledgerBalance)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => openPaySupplierModal(sup)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-medium flex items-center gap-1 mx-auto transition-colors"
                        title="Record payment / payout to distributor"
                      >
                        <Send className="w-3 h-3 text-zinc-400" />
                        <span>Pay</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-sm w-full p-5 space-y-3.5 text-xs shadow-xl">
            <h3 className="font-semibold text-sm text-zinc-100">Add Supplier</h3>
            <form onSubmit={handleAddSupplier} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Abbott Distribution"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Contact Details</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Phone, email, or representative"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Starting Ledger Balance (PKR)</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {isPayOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-sm w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="border-b border-zinc-800 pb-2">
              <h3 className="font-semibold text-sm text-zinc-100">Pay Supplier / Distributor</h3>
              <p className="text-[11px] text-zinc-400">Vendor: <span className="text-zinc-200 font-medium">{selectedSupplier.name}</span></p>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded flex justify-between items-center">
              <span className="text-zinc-400">Current Payable Balance:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {formatCurrency(selectedSupplier.ledgerBalance)}
              </span>
            </div>

            <form onSubmit={handlePaySupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Amount to Pay (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  max={selectedSupplier.ledgerBalance > 0 ? selectedSupplier.ledgerBalance : undefined}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="e.g. 5000"
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
                  <option value="CASH">CASH (Deducted from Cash Drawer)</option>
                  <option value="BANK">BANK TRANSFER / ONLINE</option>
                  <option value="CHEQUE">BANK CHEQUE</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Cheque / Voucher / Reference # (Optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Chq # 481920 or Cash to Order Booker"
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
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded disabled:opacity-50"
                >
                  {paySubmitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
