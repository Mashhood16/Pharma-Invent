"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Building2,
  Calendar,
  FileText,
  RefreshCw,
  Plus,
  Package,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PurchasesWeeklyInflowPage() {
  const [data, setData] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Purchase / Stock In Modal State
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [boxesPurchased, setBoxesPurchased] = useState("");
  const [unitsPerBox, setUnitsPerBox] = useState("100");
  const [buyPricePerBox, setBuyPricePerBox] = useState("");
  const [sellPricePerBox, setSellPricePerBox] = useState("");
  const [sellPricePerTab, setSellPricePerTab] = useState("");

  useEffect(() => {
    loadInflow();
    loadSuppliers();
    loadMedicines();
  }, []);

  const loadInflow = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchases/weekly-inflow");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const json = await res.json();
        setSuppliers(json || []);
        if (json && json.length > 0) {
          setSelectedSupplierId(json[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMedicines = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const json = await res.json();
        setMedicines(json || []);
        if (json && json.length > 0) {
          setSelectedMedicineId(json[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Smart price sync handlers: when user enters Sell/Box & Tablets per Box, calculate Sell/Tab with math
  const calculateTabPrice = (boxVal: string, unitsVal: string) => {
    const box = parseFloat(boxVal);
    const units = parseInt(unitsVal);
    if (!isNaN(box) && !isNaN(units) && units > 0) {
      const perTab = box / units;
      return perTab % 1 === 0 ? perTab.toFixed(2) : perTab.toFixed(2);
    }
    return "";
  };

  const handleSellBoxChange = (val: string) => {
    setSellPricePerBox(val);
    const computedTab = calculateTabPrice(val, unitsPerBox);
    if (computedTab) {
      setSellPricePerTab(computedTab);
    } else if (val === "") {
      setSellPricePerTab("");
    }
  };

  const handleSellTabChange = (val: string) => {
    setSellPricePerTab(val);
    const tab = parseFloat(val);
    const units = parseInt(unitsPerBox);
    if (!isNaN(tab) && !isNaN(units) && units > 0) {
      const computedBox = tab * units;
      setSellPricePerBox(computedBox.toFixed(2));
    } else if (val === "") {
      setSellPricePerBox("");
    }
  };

  const handleUnitsPerBoxChange = (val: string) => {
    setUnitsPerBox(val);
    if (sellPricePerBox) {
      const computedTab = calculateTabPrice(sellPricePerBox, val);
      if (computedTab) {
        setSellPricePerTab(computedTab);
      }
    }
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !selectedMedicineId || !batchNumber || !boxesPurchased) return;

    const boxes = parseFloat(boxesPurchased) || 0;
    const buyPrice = parseFloat(buyPricePerBox) || 0;
    const totalCost = boxes * buyPrice;

    const uPerBox = parseInt(unitsPerBox) > 0 ? parseInt(unitsPerBox) : 100;
    const sBox = parseFloat(sellPricePerBox) || 0;
    let sTab = parseFloat(sellPricePerTab);

    // If user only added sell/box price and number of tablets, calculate price per tablet with math
    if (sBox > 0 && (isNaN(sTab) || sTab <= 0)) {
      sTab = Number((sBox / uPerBox).toFixed(2));
    }

    try {
      const res = await fetch("/api/purchases/weekly-inflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          invoiceNumber,
          totalCost,
          amountPaid: parseFloat(amountPaid) || totalCost,
          items: [
            {
              medicineId: selectedMedicineId,
              batchNumber,
              expiryDate: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              boxesPurchased: boxes,
              unitsPerBox: uPerBox,
              buyPricePerBox: buyPrice,
              retailPricePerBox: sBox,
              retailPricePerUnit: sTab || 0,
            },
          ],
        }),
      });

      if (res.ok) {
        setIsStockInOpen(false);
        setInvoiceNumber("");
        setBatchNumber("");
        setBoxesPurchased("");
        setBuyPricePerBox("");
        setSellPricePerBox("");
        setSellPricePerTab("");
        setAmountPaid("");
        loadInflow();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalSpent = data?.totalMoneySpentThisWeek || 0;
  const suppliersList = data?.supplierInflow || [];
  const weeklyPurchases = data?.weeklyPurchasesList || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto font-sans">
      {/* Header */}
      <div className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Truck className="w-4 h-4 text-zinc-400" />
          <h1 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Weekly Inventory Inflow & Vendor Purchases (PKR)
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsStockInOpen(true)}
            className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Stock Delivery</span>
          </button>
          <button
            onClick={loadInflow}
            className="p-1 text-zinc-400 hover:text-zinc-200"
            title="Refresh Inflow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Weekly Metric Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Current Week Stock Spending (PKR)
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {formatCurrency(totalSpent)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Total invoiced wholesale deliveries
            </div>
          </div>

          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Active Suppliers This Week
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {suppliersList.length} Vendors
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Distributor accounts with deliveries
            </div>
          </div>

          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Shipment Invoices Received
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {weeklyPurchases.length} Shipments
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Recorded inward purchase orders
            </div>
          </div>
        </div>

        {/* Grouped by Supplier Inflow */}
        {suppliersList.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Inflow by Supplier
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suppliersList.map((sup: any) => (
                <div
                  key={sup.supplierId}
                  className="p-3 rounded bg-zinc-900/60 border border-zinc-800 space-y-1.5"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs text-zinc-100">{sup.supplierName}</span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1 rounded">
                      {sup.ordersCount} shipment(s)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-zinc-800/60">
                    <span className="text-zinc-500 text-[11px]">This Week:</span>
                    <span className="font-mono font-semibold text-zinc-200">
                      {formatCurrency(sup.totalCost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Itemized Deliveries Table */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Inward Stock Deliveries Log
          </div>

          <div className="border border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-medium">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Invoice #</th>
                  <th className="py-2 px-3">Supplier</th>
                  <th className="py-2 px-3">Items / Batches Received</th>
                  <th className="py-2 px-3 text-right">Invoice Total (PKR)</th>
                  <th className="py-2 px-3 text-right">Amount Paid (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {weeklyPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No stock-in deliveries recorded this week. Click "Record Stock Delivery" to log an incoming shipment.
                    </td>
                  </tr>
                ) : (
                  weeklyPurchases.map((p: any) => (
                    <tr key={p.id} className="hover:bg-zinc-900/40">
                      <td className="py-2 px-3 text-zinc-400 font-mono text-[11px]">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="py-2 px-3 font-mono text-zinc-300">
                        {p.invoiceNumber || "—"}
                      </td>
                      <td className="py-2 px-3 text-zinc-200 font-medium">
                        {p.supplier?.name}
                      </td>
                      <td className="py-2 px-3 text-zinc-400">
                        {p.items?.map((item: any) => (
                          <div key={item.id} className="text-[11px]">
                            {item.batch?.medicine?.brandName} (Bt: {item.batch?.batchNumber}) —{" "}
                            {Number(item.boxesPurchased).toFixed(0)} bxs @ {formatCurrency(item.buyPricePerBox)}/box
                          </div>
                        ))}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-zinc-100">
                        {formatCurrency(p.totalCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-zinc-300">
                        {formatCurrency(p.amountPaid)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Delivery Modal with Buy/Box, Sell/Box, Sell/Tab in PKR */}
      {isStockInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-lg w-full p-5 space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-sm text-zinc-100">
              Record Inward Stock Delivery (Currency: PKR)
            </h3>

            <form onSubmit={handleStockInSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Supplier / Vendor *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 text-xs"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    {suppliers.length === 0 && (
                      <option value="">No suppliers yet - Add in Suppliers tab</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-081"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Medicine Product *</label>
                <select
                  value={selectedMedicineId}
                  onChange={(e) => setSelectedMedicineId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 text-xs"
                  required
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.brandName} ({m.genericFormula})</option>
                  ))}
                  {medicines.length === 0 && (
                    <option value="">No medicines registered yet</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g. B-991"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Boxes Received *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={boxesPurchased}
                    onChange={(e) => setBoxesPurchased(e.target.value)}
                    placeholder="20"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Tabs/Units per Box</label>
                  <input
                    type="number"
                    value={unitsPerBox}
                    onChange={(e) => handleUnitsPerBoxChange(e.target.value)}
                    placeholder="100"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono"
                  />
                </div>
              </div>

              {/* Pricing: Buy/Box, Sell/Box, Sell/Tab in PKR */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-850">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Buy / Box (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={buyPricePerBox}
                    onChange={(e) => setBuyPricePerBox(e.target.value)}
                    placeholder="500"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Sell / Box (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellPricePerBox}
                    onChange={(e) => handleSellBoxChange(e.target.value)}
                    placeholder="600"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1 truncate" title="Sell / Tab (PKR) - Auto-calculated with math">
                    Sell / Tab (PKR) <span className="text-[10px] text-emerald-400 font-normal">Auto</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellPricePerTab}
                    onChange={(e) => handleSellTabChange(e.target.value)}
                    placeholder={
                      parseFloat(sellPricePerBox) > 0 && parseInt(unitsPerBox) > 0
                        ? (parseFloat(sellPricePerBox) / parseInt(unitsPerBox)).toFixed(2)
                        : "e.g. 6.00"
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono"
                  />
                </div>

                {/* Live Math Calculation Formula */}
                {parseFloat(sellPricePerBox) > 0 && parseInt(unitsPerBox) > 0 && (
                  <div className="col-span-3 mt-1 px-2.5 py-1.5 rounded bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between text-[11px] text-emerald-400 font-mono">
                    <span className="flex items-center space-x-1.5">
                      <span className="text-emerald-500 font-bold">🧮 Math:</span>
                      <span>Rs. {sellPricePerBox} ÷ {unitsPerBox} tabs</span>
                    </span>
                    <span className="font-semibold text-emerald-300">
                      = Rs. {(parseFloat(sellPricePerBox) / parseInt(unitsPerBox)).toFixed(2)} / tablet
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Amount Paid Immediately (PKR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Leave blank if fully paid"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockInOpen(false)}
                  className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded"
                >
                  Log Delivery & Inflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
