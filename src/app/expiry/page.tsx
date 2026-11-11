"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarX,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate, daysUntilExpiry } from "@/lib/utils";

export default function ExpiryPage() {
  const [expiredItems, setExpiredItems] = useState<any[]>([]);
  const [nearExpiryItems, setNearExpiryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRtvId, setProcessingRtvId] = useState<string | null>(null);
  const [rtvSuccessMsg, setRtvSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"EXPIRED" | "NEAR">("EXPIRED");

  useEffect(() => {
    loadExpiryData();
  }, []);

  const loadExpiryData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expiry");
      if (res.ok) {
        const data = await res.json();
        setExpiredItems(data.expired || []);
        setNearExpiryItems(data.nearExpiry || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRtv = async (batchId: string) => {
    setProcessingRtvId(batchId);
    setRtvSuccessMsg(null);

    try {
      const res = await fetch("/api/expiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });

      const data = await res.json();
      if (res.ok) {
        setRtvSuccessMsg(data.message);
        loadExpiryData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingRtvId(null);
    }
  };

  const totalExpiredBoxes = expiredItems.reduce(
    (sum, item) => sum + Number(item.boxesInStock),
    0
  );
  const totalExpiredValue = expiredItems.reduce(
    (sum, item) => sum + Number(item.boxesInStock) * Number(item.buyPricePerBox),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto font-sans">
      {/* Header */}
      <div className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <CalendarX className="w-4 h-4 text-zinc-400" />
          <h1 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Expiry Monitoring & Return to Vendor (RTV)
          </h1>
        </div>

        <button
          onClick={loadExpiryData}
          className="p-1 text-zinc-400 hover:text-zinc-200"
          title="Refresh List"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {rtvSuccessMsg && (
        <div className="mx-4 mt-3 p-2.5 rounded bg-emerald-950/40 border border-emerald-900 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{rtvSuccessMsg}</span>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Expired Batches On Shelf
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {expiredItems.length} Batches
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Pull from retail shelves for vendor return
            </div>
          </div>

          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Expired Stock Quantity
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {totalExpiredBoxes.toFixed(1)} Boxes
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Total physical boxes awaiting RTV
            </div>
          </div>

          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">
              Recoverable Wholesale Value
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {formatCurrency(totalExpiredValue)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Wholesale value claimable from suppliers
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab("EXPIRED")}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "EXPIRED"
                ? "border-zinc-200 text-zinc-100 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Expired Batches ({expiredItems.length})
          </button>
          <button
            onClick={() => setActiveTab("NEAR")}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "NEAR"
                ? "border-zinc-200 text-zinc-100 font-semibold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Near Expiry — Next 90 Days ({nearExpiryItems.length})
          </button>
        </div>

        {/* Expired Batches Table */}
        {activeTab === "EXPIRED" && (
          <div className="border border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-medium">
                  <th className="py-2 px-3">Medicine & Formula</th>
                  <th className="py-2 px-3">Batch Number</th>
                  <th className="py-2 px-3">Supplier (Vendor)</th>
                  <th className="py-2 px-3">Expired Date</th>
                  <th className="py-2 px-3 text-right">Boxes Remaining</th>
                  <th className="py-2 px-3 text-right">Wholesale Cost</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {expiredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      No expired items found on shelves.
                    </td>
                  </tr>
                ) : (
                  expiredItems.map((item) => {
                    const boxes = Number(item.boxesInStock);
                    const wholesaleCost = boxes * Number(item.buyPricePerBox);

                    return (
                      <tr key={item.batchId} className="hover:bg-zinc-900/40">
                        <td className="py-2 px-3">
                          <div className="font-medium text-zinc-100">{item.brandName}</div>
                          <div className="text-[10px] text-zinc-500">{item.genericFormula}</div>
                        </td>

                        <td className="py-2 px-3 font-mono text-zinc-300">
                          {item.batchNumber}
                        </td>

                        <td className="py-2 px-3 text-zinc-400">
                          {item.supplierName}
                        </td>

                        <td className="py-2 px-3 font-mono text-red-400">
                          {formatDate(item.expiryDate)}
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-medium text-zinc-100">
                          {boxes.toFixed(2)} bxs
                        </td>

                        <td className="py-2 px-3 text-right font-mono text-zinc-300">
                          {formatCurrency(wholesaleCost)}
                        </td>

                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleProcessRtv(item.batchId)}
                            disabled={processingRtvId === item.batchId}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium border border-zinc-700 disabled:opacity-50"
                          >
                            {processingRtvId === item.batchId ? "Processing..." : "Process RTV"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Near Expiry Table */}
        {activeTab === "NEAR" && (
          <div className="border border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-medium">
                  <th className="py-2 px-3">Medicine</th>
                  <th className="py-2 px-3">Batch</th>
                  <th className="py-2 px-3">Supplier</th>
                  <th className="py-2 px-3">Expiry Date</th>
                  <th className="py-2 px-3">Days Left</th>
                  <th className="py-2 px-3 text-right">Boxes in Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {nearExpiryItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No batches expiring within the next 90 days.
                    </td>
                  </tr>
                ) : (
                  nearExpiryItems.map((item) => {
                    const days = daysUntilExpiry(item.expiryDate);

                    return (
                      <tr key={item.batchId} className="hover:bg-zinc-900/40">
                        <td className="py-2 px-3 font-medium text-zinc-100">
                          {item.brandName}
                        </td>
                        <td className="py-2 px-3 font-mono text-zinc-300">
                          {item.batchNumber}
                        </td>
                        <td className="py-2 px-3 text-zinc-400">
                          {item.supplierName}
                        </td>
                        <td className="py-2 px-3 font-mono text-zinc-300">
                          {formatDate(item.expiryDate)}
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                            {days} days
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-zinc-100">
                          {Number(item.boxesInStock).toFixed(2)} bxs
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
