"use client";

import React, { useState, useEffect } from "react";
import {
  Pill,
  Search,
  Plus,
  RefreshCw,
  Package,
  Trash2,
  ChevronDown,
  ChevronRight,
  Filter,
  FileText,
  Copy,
  Printer,
  Check,
  UploadCloud,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatCurrency, formatDate, PHARMACY_CATEGORIES } from "@/lib/utils";

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Distributor Reorder Sheet State
  const [isReorderSheetOpen, setIsReorderSheetOpen] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Bulk Upload State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");

  // New Medicine Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newFormula, setNewFormula] = useState("");
  const [newCategory, setNewCategory] = useState<string>(PHARMACY_CATEGORIES[0]);
  const [newBarcode, setNewBarcode] = useState("");
  const [newReorder, setNewReorder] = useState(2);

  // Optional Initial Batch with Buy/Box, Sell/Box, Sell/Tab
  const [withBatch, setWithBatch] = useState(true);
  const [batchNumber, setBatchNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [boxesInStock, setBoxesInStock] = useState("");
  const [unitsPerBox, setUnitsPerBox] = useState("100");
  const [buyPricePerBox, setBuyPricePerBox] = useState("");
  const [sellPricePerBox, setSellPricePerBox] = useState("");
  const [sellPricePerTab, setSellPricePerTab] = useState("");

  useEffect(() => {
    loadInventory();
    loadSuppliers();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setMedicines(data || []);
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
        const data = await res.json();
        setSuppliers(data || []);
        if (data && data.length > 0) {
          setSupplierId(data[0].id);
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

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.trim() || !newFormula.trim()) return;

    try {
      const payload: any = {
        brandName: newBrand,
        genericFormula: newFormula,
        category: newCategory,
        barcode: newBarcode || null,
        reorderLevel: newReorder,
      };

      if (withBatch && batchNumber.trim()) {
        const uPerBox = parseInt(unitsPerBox) > 0 ? parseInt(unitsPerBox) : 100;
        const sBox = parseFloat(sellPricePerBox) || 0;
        let sTab = parseFloat(sellPricePerTab);

        // If user only added sell/box price and number of tablets, calculate price per tablet with math
        if (sBox > 0 && (isNaN(sTab) || sTab <= 0)) {
          sTab = Number((sBox / uPerBox).toFixed(2));
        }

        payload.initialBatch = {
          batchNumber,
          supplierId,
          expiryDate: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          boxesInStock: parseFloat(boxesInStock) || 0,
          unitsPerBox: uPerBox,
          buyPricePerBox: parseFloat(buyPricePerBox) || 0,
          retailPricePerBox: sBox,
          retailPricePerUnit: sTab || 0,
        };
      }

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNewBrand("");
        setNewFormula("");
        setNewBarcode("");
        setBatchNumber("");
        setBoxesInStock("");
        setBuyPricePerBox("");
        setSellPricePerBox("");
        setSellPricePerTab("");
        loadInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMedicine = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will permanently remove the product and all associated batches.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/inventory?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadInventory();
      } else {
        alert("Failed to delete medicine.");
      }
    } catch {
      alert("Error while deleting medicine.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch =
      m.brandName.toLowerCase().includes(search.toLowerCase()) ||
      m.genericFormula.toLowerCase().includes(search.toLowerCase()) ||
      (m.barcode && m.barcode.includes(search));

    const matchesCategory =
      selectedCategory === "ALL" || m.category === selectedCategory;

    if (lowStockOnly) {
      return matchesSearch && matchesCategory && m.isLowStock;
    }
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = medicines.filter((m) => m.isLowStock).length;
  const lowStockMedicines = medicines.filter((m) => m.isLowStock);

  const handleCopyWhatsApp = () => {
    if (lowStockMedicines.length === 0) {
      alert("No low stock medicines to reorder right now!");
      return;
    }

    let text = `*PHARMACY PURCHASE REORDER SHEET*\n`;
    text += `Date: ${new Date().toLocaleDateString("en-PK")}\n`;
    text += `Total Items to Reorder: ${lowStockMedicines.length}\n`;
    text += `--------------------------------------\n\n`;

    lowStockMedicines.forEach((med, index) => {
      const remaining = med.totalBoxesInStock || 0;
      text += `${index + 1}. *${med.brandName}* (${med.genericFormula})\n`;
      text += `   - Stock Left: ${remaining} bxs (Reorder at ${med.reorderLevel})\n`;
      text += `   - Suggested Order: 10 Boxes\n\n`;
    });

    text += `--------------------------------------\n`;
    text += `Please book order and confirm delivery schedule.`;

    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setBulkError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          setBulkError("The uploaded spreadsheet contains no data rows.");
          setParsedRows([]);
          return;
        }

        setParsedRows(data);
      } catch (err: any) {
        setBulkError("Failed to parse Excel file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmBulkUpload = async () => {
    if (parsedRows.length === 0) return;
    setBulkUploading(true);
    setBulkError("");
    setBulkSuccessMsg("");

    try {
      const res = await fetch("/api/inventory/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsedRows }),
      });

      const json = await res.json();
      if (res.ok) {
        setBulkSuccessMsg(json.message);
        loadInventory();
        setTimeout(() => {
          setIsBulkModalOpen(false);
          setParsedRows([]);
          setBulkFileName("");
          setBulkSuccessMsg("");
        }, 1800);
      } else {
        setBulkError(json.error || "Failed to import items.");
      }
    } catch {
      setBulkError("Network error while uploading bulk stock.");
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Action Header */}
      <div className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2">
          <Pill className="w-4 h-4 text-zinc-400" />
          <h1 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Medicine Inventory & Pricing Master (PKR)
          </h1>
          <span className="text-zinc-500 text-xs">({medicines.length} products)</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsReorderSheetOpen(true)}
            className="px-2.5 py-1 bg-amber-950/40 border border-amber-800/60 text-amber-400 hover:bg-amber-900/40 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors"
            title="Generate distributor purchase order sheet for low stock items"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reorder Sheet ({lowStockCount})</span>
          </button>

          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-2.5 py-1 rounded text-xs border transition-colors ${
              lowStockOnly
                ? "bg-red-950/60 border-red-800 text-red-400 font-medium"
                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Low Stock ({lowStockCount})
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors"
            title="Import medicines and batches from an Excel sheet"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            <span>Bulk Upload</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Filter Row with Category Dropdown */}
      <div className="h-10 bg-zinc-900/40 border-b border-zinc-800 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, formula, barcode..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded pl-7 pr-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Category Dropdown Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3 h-3 text-zinc-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              <option value="ALL">All Categories ({PHARMACY_CATEGORIES.length})</option>
              {PHARMACY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={loadInventory}
          className="p-1 text-zinc-400 hover:text-zinc-200"
          title="Refresh table"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Dense Enterprise Table */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredMedicines.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2 border border-dashed border-zinc-800 rounded-lg">
            <Package className="w-8 h-8 stroke-1 text-zinc-600" />
            <span className="font-medium text-zinc-400">No medicines found</span>
            <span className="text-[11px] text-zinc-500">
              Click "Add Medicine" to register products with Buy/Box, Sell/Box, and Sell/Tab rates.
            </span>
          </div>
        ) : (
          <div className="border border-zinc-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-medium">
                  <th className="py-2 px-3 w-8"></th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Brand Name</th>
                  <th className="py-2 px-3">Generic Formula</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Barcode</th>
                  <th className="py-2 px-3 text-right">Boxes Stock</th>
                  <th className="py-2 px-3 text-right">Rates (PKR)</th>
                  <th className="py-2 px-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredMedicines.map((med) => {
                  const isExpanded = expandedMedId === med.id;
                  const firstBatch = med.batches?.[0];
                  const sellBox = firstBatch?.retailPricePerBox || (firstBatch ? Number(firstBatch.retailPricePerUnit) * firstBatch.unitsPerBox : 0);
                  const sellTab = firstBatch ? Number(firstBatch.retailPricePerUnit) : 0;

                  return (
                    <React.Fragment key={med.id}>
                      <tr className="hover:bg-zinc-900/50 transition-colors">
                        <td
                          className="py-2 px-3 text-zinc-500 cursor-pointer"
                          onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </td>

                        <td className="py-2 px-3">
                          {med.isLowStock ? (
                            <span className="text-[10px] font-semibold text-red-400 bg-red-950/60 border border-red-900 px-1.5 py-0.2 rounded">
                              Low (≤{med.reorderLevel})
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400">Normal</span>
                          )}
                        </td>

                        <td
                          className="py-2 px-3 font-semibold text-zinc-100 cursor-pointer"
                          onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                        >
                          {med.brandName}
                        </td>

                        <td className="py-2 px-3 text-zinc-400">
                          {med.genericFormula}
                        </td>

                        <td className="py-2 px-3 text-zinc-300">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]">
                            {med.category}
                          </span>
                        </td>

                        <td className="py-2 px-3 font-mono text-zinc-500 text-[11px]">
                          {med.barcode || "—"}
                        </td>

                        <td className="py-2 px-3 text-right font-mono font-semibold text-zinc-200">
                          {Number(med.totalBoxesInStock).toFixed(2)} bxs
                        </td>

                        <td className="py-2 px-3 text-right font-mono text-xs">
                          {firstBatch ? (
                            <div>
                              <div className="font-semibold text-zinc-100">
                                Box: {formatCurrency(sellBox)}
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                Tab: {formatCurrency(sellTab)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>

                        {/* Delete Medicine Action */}
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleDeleteMedicine(med.id, med.brandName)}
                            disabled={deletingId === med.id}
                            className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                            title={`Delete ${med.brandName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Batches Sub-table */}
                      {isExpanded && (
                        <tr className="bg-zinc-950 border-b border-zinc-800">
                          <td colSpan={9} className="p-3">
                            <div className="bg-zinc-900/80 border border-zinc-800 rounded p-2.5 space-y-2">
                              <div className="text-[11px] font-semibold text-zinc-400">
                                Batches & Unit Economics for {med.brandName} (Currency: PKR)
                              </div>

                              {med.batches?.length === 0 ? (
                                <div className="text-zinc-500 text-[11px]">No batches logged yet for this item.</div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {med.batches.map((b: any) => {
                                    const bBoxSell = b.retailPricePerBox || Number(b.retailPricePerUnit) * b.unitsPerBox;
                                    return (
                                      <div
                                        key={b.id}
                                        className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-[11px] space-y-1 font-mono"
                                      >
                                        <div className="flex justify-between text-zinc-200 font-semibold">
                                          <span>Bt: {b.batchNumber}</span>
                                          <span>{Number(b.boxesInStock).toFixed(1)} bxs</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] border-t border-zinc-850">
                                          <div>
                                            <span className="text-zinc-500 block">Buy/Box</span>
                                            <span className="text-zinc-300">{formatCurrency(b.buyPricePerBox)}</span>
                                          </div>
                                          <div>
                                            <span className="text-zinc-500 block">Sell/Box</span>
                                            <span className="text-zinc-100 font-semibold">{formatCurrency(bBoxSell)}</span>
                                          </div>
                                          <div>
                                            <span className="text-zinc-500 block">Sell/Tab</span>
                                            <span className="text-zinc-100 font-semibold">{formatCurrency(b.retailPricePerUnit)}</span>
                                          </div>
                                        </div>
                                        <div className="flex justify-between text-zinc-500 text-[10px] pt-1">
                                          <span>Tabs/Box: {b.unitsPerBox}</span>
                                          <span>Exp: {formatDate(b.expiryDate)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Medicine Modal with Category Dropdown and Buy/Box, Sell/Box, Sell/Tab */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-lg w-full p-5 space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-sm text-zinc-100">
              Register New Medicine & Pricing (PKR)
            </h3>

            <form onSubmit={handleAddMedicine} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="e.g. Panadol 500mg"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Generic Formula *</label>
                  <input
                    type="text"
                    required
                    value={newFormula}
                    onChange={(e) => setNewFormula(e.target.value)}
                    placeholder="e.g. Paracetamol"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100"
                  />
                </div>
              </div>

              {/* Category Dropdown Menu */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 text-xs"
                    required
                  >
                    {PHARMACY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    placeholder="Scan or type"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Reorder Level (Boxes)</label>
                  <input
                    type="number"
                    value={newReorder}
                    onChange={(e) => setNewReorder(parseInt(e.target.value) || 2)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                  />
                </div>
              </div>

              {/* Initial Batch & Pricing Section */}
              <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300">Initial Batch & Unit Economics</span>
                  <label className="flex items-center space-x-1.5 text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={withBatch}
                      onChange={(e) => setWithBatch(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-800"
                    />
                    <span>Add batch with product</span>
                  </label>
                </div>

                {withBatch && (
                  <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-zinc-400 mb-1">Batch Number *</label>
                        <input
                          type="text"
                          value={batchNumber}
                          onChange={(e) => setBatchNumber(e.target.value)}
                          placeholder="e.g. B-101"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">Boxes In Stock</label>
                        <input
                          type="number"
                          step="0.1"
                          value={boxesInStock}
                          onChange={(e) => setBoxesInStock(e.target.value)}
                          placeholder="10"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">Tabs/Units per Box</label>
                        <input
                          type="number"
                          value={unitsPerBox}
                          onChange={(e) => handleUnitsPerBoxChange(e.target.value)}
                          placeholder="100"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-zinc-400 mb-1">Supplier / Distributor</label>
                        <select
                          value={supplierId}
                          onChange={(e) => setSupplierId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 text-xs"
                        >
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                          {suppliers.length === 0 && (
                            <option value="">Direct / Walk-in delivery</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100"
                        />
                      </div>
                    </div>

                    {/* Crucial Pricing Fields: Buy/Box, Sell/Box, Sell/Tab in PKR */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-850">
                      <div>
                        <label className="block text-zinc-300 font-medium mb-1">Buy / Box (PKR)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={buyPricePerBox}
                          onChange={(e) => setBuyPricePerBox(e.target.value)}
                          placeholder="e.g. 500"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-zinc-300 font-medium mb-1">Sell / Box (PKR)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={sellPricePerBox}
                          onChange={(e) => handleSellBoxChange(e.target.value)}
                          placeholder="e.g. 600"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono font-medium"
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
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 font-mono font-medium"
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
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distributor Reorder Sheet Modal */}
      {isReorderSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full p-5 space-y-4 text-xs shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
              <div>
                <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Distributor Purchase Reorder Sheet</span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Products with stock currently at or below their reorder threshold (&le; 2 boxes)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyWhatsApp}
                  className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-300 rounded font-medium flex items-center gap-1 transition-colors"
                  title="Copy formatted order list to paste into WhatsApp"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{copiedWhatsApp ? "Copied!" : "Copy for WhatsApp"}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PO</span>
                </button>

                <button
                  onClick={() => setIsReorderSheetOpen(false)}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {lowStockMedicines.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                All inventory is sufficiently stocked. No items currently require reordering.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto border border-zinc-800 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-medium">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Brand Name</th>
                      <th className="py-2 px-3">Formula</th>
                      <th className="py-2 px-3 text-center">Remaining</th>
                      <th className="py-2 px-3 text-center">Suggested Order</th>
                      <th className="py-2 px-3 text-right">Estimated Cost (Buy/Box)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {lowStockMedicines.map((med, idx) => {
                      const firstBatch = med.batches?.[0];
                      const buyBox = firstBatch?.buyPricePerBox ? Number(firstBatch.buyPricePerBox) : 0;
                      const suggested = 10;
                      const estCost = suggested * buyBox;

                      return (
                        <tr key={med.id} className="hover:bg-zinc-900/50">
                          <td className="py-2 px-3 font-mono text-zinc-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-zinc-100">{med.brandName}</td>
                          <td className="py-2 px-3 text-zinc-400 text-[11px]">{med.genericFormula}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-red-400">
                            {med.totalBoxesInStock} bxs
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-semibold text-emerald-400">
                            {suggested} Boxes
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-zinc-300">
                            {buyBox > 0 ? formatCurrency(estCost) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Upload Excel Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-3xl w-full p-5 space-y-4 text-xs shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
              <div>
                <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  <span>Bulk Upload Medicines & Stock (Excel Sheet)</span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Import hundreds of products, initial batches, and wholesale/retail prices simultaneously.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setParsedRows([]);
                  setBulkFileName("");
                  setBulkError("");
                }}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Download Template */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-zinc-200 block text-xs">
                  Step 1: Download Formatted Excel Template
                </span>
                <span className="text-zinc-500 text-[11px]">
                  Includes all 13 necessary column headers and 3 sample medicine rows.
                </span>
              </div>

              <a
                href="/api/inventory/bulk-upload"
                download="pharma-inventory-template.xlsx"
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 rounded font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Template (.xlsx)</span>
              </a>
            </div>

            {/* Step 2: Choose File */}
            <div className="space-y-2">
              <span className="font-semibold text-zinc-300 block text-xs">
                Step 2: Upload Your Filled Excel File
              </span>

              <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg p-4 text-center cursor-pointer bg-zinc-950 transition-colors">
                <input
                  type="file"
                  id="excel-file-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="excel-file-input" className="cursor-pointer block space-y-1">
                  <FileSpreadsheet className="w-8 h-8 text-blue-400 mx-auto stroke-1" />
                  <span className="text-zinc-300 font-medium block">
                    {bulkFileName ? `Selected: ${bulkFileName}` : "Click to select or drag .xlsx file here"}
                  </span>
                  <span className="text-zinc-500 text-[11px] block">
                    Supported formats: Microsoft Excel (.xlsx, .xls) and CSV (.csv)
                  </span>
                </label>
              </div>
            </div>

            {/* Error or Success Alerts */}
            {bulkError && (
              <div className="p-2.5 rounded bg-red-950/50 border border-red-800 text-red-300 text-xs">
                {bulkError}
              </div>
            )}

            {bulkSuccessMsg && (
              <div className="p-2.5 rounded bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{bulkSuccessMsg}</span>
              </div>
            )}

            {/* Step 3: Parsed Data Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-1.5 flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300">
                    Preview: Found {parsedRows.length} product(s) in sheet
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    *Sell/Tab is auto-calculated if left empty in sheet
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto border border-zinc-800 rounded bg-zinc-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 text-[10px] uppercase font-medium">
                        <th className="py-1.5 px-2.5">#</th>
                        <th className="py-1.5 px-2.5">Brand Name</th>
                        <th className="py-1.5 px-2.5">Generic Formula</th>
                        <th className="py-1.5 px-2.5">Category</th>
                        <th className="py-1.5 px-2.5">Batch</th>
                        <th className="py-1.5 px-2.5 text-center">Boxes</th>
                        <th className="py-1.5 px-2.5 text-center">Tabs/Bx</th>
                        <th className="py-1.5 px-2.5 text-right">Buy/Bx</th>
                        <th className="py-1.5 px-2.5 text-right">Sell/Bx</th>
                        <th className="py-1.5 px-2.5 text-right">Sell/Tab</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80 font-mono text-[11px]">
                      {parsedRows.map((r, i) => {
                        const brand = r["Brand Name"] || r.brandName || "—";
                        const formula = r["Generic Formula"] || r.genericFormula || "—";
                        const cat = r["Category"] || r.category || "Tablets (Oral)";
                        const batch = r["Batch Number"] || r.batchNumber || "B-01";
                        const boxes = r["Boxes in Stock"] || r.boxesInStock || 0;
                        const tabs = r["Tabs per Box"] || r.unitsPerBox || 100;
                        const buyBox = r["Buy Price per Box (PKR)"] || r.buyPricePerBox || 0;
                        const sellBox = r["Sell Price per Box (PKR)"] || r.sellPricePerBox || 0;
                        let sellTab = r["Sell Price per Tab (PKR)"] || r.sellPricePerTab;
                        if (!sellTab && sellBox > 0 && tabs > 0) {
                          sellTab = (sellBox / tabs).toFixed(2);
                        }

                        return (
                          <tr key={i} className="hover:bg-zinc-900/40">
                            <td className="py-1 px-2.5 text-zinc-500">{i + 1}</td>
                            <td className="py-1 px-2.5 font-sans font-medium text-zinc-100">{brand}</td>
                            <td className="py-1 px-2.5 font-sans text-zinc-400 text-[10px]">{formula}</td>
                            <td className="py-1 px-2.5 font-sans text-zinc-400 text-[10px]">{cat}</td>
                            <td className="py-1 px-2.5 text-zinc-300">{batch}</td>
                            <td className="py-1 px-2.5 text-center text-zinc-200">{boxes}</td>
                            <td className="py-1 px-2.5 text-center text-zinc-400">{tabs}</td>
                            <td className="py-1 px-2.5 text-right text-zinc-300">{buyBox}</td>
                            <td className="py-1 px-2.5 text-right text-zinc-100 font-semibold">{sellBox}</td>
                            <td className="py-1 px-2.5 text-right text-emerald-400">{sellTab || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
              <span className="text-[11px] text-zinc-500">
                {parsedRows.length > 0 ? `${parsedRows.length} items ready for import` : "Upload a spreadsheet to preview items"}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkModalOpen(false);
                    setParsedRows([]);
                    setBulkFileName("");
                    setBulkError("");
                  }}
                  className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBulkUpload}
                  disabled={parsedRows.length === 0 || bulkUploading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded disabled:opacity-40 flex items-center gap-1.5 shadow"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>
                    {bulkUploading ? "Importing to Stock..." : `Import ${parsedRows.length} Product(s)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
