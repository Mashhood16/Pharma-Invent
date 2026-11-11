"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Receipt,
  RefreshCw,
  Trash2,
  Calculator,
  Printer,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FinancialsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Z-Report Day-End Cash Closing State
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [zReportData, setZReportData] = useState<any>(null);
  const [zReportLoading, setZReportLoading] = useState(false);
  const [countedCash, setCountedCash] = useState("");

  const openZReport = async () => {
    setZReportLoading(true);
    setIsZReportOpen(true);
    try {
      const res = await fetch("/api/financials/z-report");
      if (res.ok) {
        const json = await res.json();
        setZReportData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setZReportLoading(false);
    }
  };

  useEffect(() => {
    loadFinancials();
  }, []);

  const loadFinancials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financials");
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

  const handleDeleteSale = async (id: string, receiptNumber: string) => {
    if (
      !confirm(
        `Are you sure you want to void / delete receipt "${receiptNumber}"?\n\nThis will remove the transaction, restore the sold medicine units back to inventory stock, and recalculate financial profits.`
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/sales?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadFinancials();
      } else {
        const errJson = await res.json();
        alert(errJson.error || "Failed to delete sale transaction.");
      }
    } catch {
      alert("Error while deleting sale transaction.");
    } finally {
      setDeletingId(null);
    }
  };

  const metrics = data?.metrics || {
    daily: { sales: 0, profit: 0, orders: 0 },
    monthly: { sales: 0, profit: 0, orders: 0 },
    yearly: { sales: 0, profit: 0, orders: 0 },
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto font-sans">
      {/* Top Banner */}
      <div className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h1 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Financial & Gross Profit Analytics
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={openZReport}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            title="Calculate today's cash drawer balance & print daily Z-Report"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>Day-End Z-Report</span>
          </button>

          <button
            onClick={loadFinancials}
            className="p-1 text-zinc-400 hover:text-zinc-200"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Core Financial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Daily */}
          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400 uppercase tracking-wider font-medium">
                Today (Daily)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {metrics.daily.orders} Orders
              </span>
            </div>

            <div>
              <div className="text-[11px] text-zinc-500">Gross Sales</div>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {formatCurrency(metrics.daily.sales)}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-zinc-400">Net Profit:</span>
              <span className="font-mono font-semibold text-emerald-400">
                +{formatCurrency(metrics.daily.profit)}
              </span>
            </div>
          </div>

          {/* Monthly */}
          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400 uppercase tracking-wider font-medium">
                This Month (MTD)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {metrics.monthly.orders} Orders
              </span>
            </div>

            <div>
              <div className="text-[11px] text-zinc-500">Monthly Sales</div>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {formatCurrency(metrics.monthly.sales)}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-zinc-400">Net Profit:</span>
              <span className="font-mono font-semibold text-emerald-400">
                +{formatCurrency(metrics.monthly.profit)}
              </span>
            </div>
          </div>

          {/* Yearly */}
          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-400 uppercase tracking-wider font-medium">
                This Year (YTD)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {metrics.yearly.orders} Orders
              </span>
            </div>

            <div>
              <div className="text-[11px] text-zinc-500">Yearly Sales</div>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {formatCurrency(metrics.yearly.sales)}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-zinc-400">Net Profit:</span>
              <span className="font-mono font-semibold text-emerald-400">
                +{formatCurrency(metrics.yearly.profit)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Sales & Margin Audit Ledger
          </div>

          <div className="border border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-medium">
                  <th className="py-2 px-3">Receipt #</th>
                  <th className="py-2 px-3">Date & Time</th>
                  <th className="py-2 px-3">Cashier</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Payment</th>
                  <th className="py-2 px-3 text-right">Sale Amount</th>
                  <th className="py-2 px-3 text-right">Profit</th>
                  <th className="py-2 px-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {data?.recentSales?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500">
                      No sales recorded yet. Completed transactions will appear here.
                    </td>
                  </tr>
                ) : (
                  data?.recentSales?.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-medium text-zinc-200">
                        {sale.receiptNumber}
                      </td>
                      <td className="py-2 px-3 text-zinc-500 font-mono text-[11px]">
                        {new Date(sale.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-zinc-300">
                        {sale.cashierName}
                      </td>
                      <td className="py-2 px-3 text-zinc-400">
                        {sale.customerName || "Walk-in Cash"}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-zinc-100">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-400 font-medium">
                        +{formatCurrency(sale.totalProfit)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteSale(sale.id, sale.receiptNumber)}
                          disabled={deletingId === sale.id}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-30"
                          title="Void / Delete Transaction & Restore Stock"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Day-End Cash Closing (Z-Report) Modal */}
      {isZReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
              <div>
                <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span>Day-End Cash Drawer Closing (Z-Report)</span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Daily Shift Audit & Physical Register Cash Reconciliation
                </p>
              </div>
              <button
                onClick={() => setIsZReportOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {zReportLoading || !zReportData ? (
              <div className="py-8 text-center text-zinc-500">Calculating today's cash flow...</div>
            ) : (
              <div className="space-y-3 font-sans">
                {/* Flow Breakdown */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                  <div className="flex justify-between text-zinc-400">
                    <span>1. Cash Sales Today ({zReportData.totalOrders} total orders):</span>
                    <span className="font-mono text-zinc-100 font-semibold">
                      +{formatCurrency(zReportData.cashSales)}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-400">
                    <span>2. Khata Debt Collected in Cash:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      +{formatCurrency(zReportData.khataCashCollected)}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-400">
                    <span>3. Cash Paid to Suppliers / Expenses:</span>
                    <span className="font-mono text-red-400 font-semibold">
                      -{formatCurrency(zReportData.supplierCashPaid)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-sm font-bold">
                    <span className="text-zinc-200">Expected Register Cash:</span>
                    <span className="font-mono text-amber-400">
                      {formatCurrency(zReportData.netExpectedDrawerCash)}
                    </span>
                  </div>
                </div>

                {/* Additional Non-Cash Audit Info */}
                <div className="flex justify-between text-[11px] px-1 text-zinc-500">
                  <span>Non-Cash Credit Sales Today:</span>
                  <span className="font-mono">{formatCurrency(zReportData.creditSales)}</span>
                </div>

                {/* Physical Cash Verification Input */}
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-2">
                  <label className="block text-zinc-300 font-medium text-xs">
                    Count Physical Cash in Drawer (PKR):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter counted notes & coins"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100 font-mono font-bold text-sm"
                  />

                  {countedCash !== "" && !isNaN(parseFloat(countedCash)) && (
                    <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-medium">Reconciliation Result:</span>
                      {(() => {
                        const diff = parseFloat(countedCash) - zReportData.netExpectedDrawerCash;
                        if (Math.abs(diff) < 0.01) {
                          return (
                            <span className="font-bold text-emerald-400 font-mono">
                              ✓ Balanced (Rs. 0.00 difference)
                            </span>
                          );
                        } else if (diff > 0) {
                          return (
                            <span className="font-bold text-emerald-400 font-mono">
                              + Over by {formatCurrency(diff)}
                            </span>
                          );
                        } else {
                          return (
                            <span className="font-bold text-red-400 font-mono">
                              - Short by {formatCurrency(Math.abs(diff))}
                            </span>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>

                {/* Print Action */}
                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Daily Z-Report Slip</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
