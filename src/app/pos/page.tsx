"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Barcode,
  Search,
  Plus,
  Trash2,
  DollarSign,
  User,
  CreditCard,
  Printer,
  AlertCircle,
  Package,
} from "lucide-react";
import { formatCurrency, isLowStock } from "@/lib/utils";
import {
  ThermalReceiptModal,
  ReceiptData,
} from "@/components/pos/thermal-receipt-modal";

interface BatchItem {
  id: string;
  batchNumber: string;
  expiryDate: string;
  boxesInStock: string | number;
  unitsPerBox: number;
  buyPricePerBox: string | number;
  retailPricePerBox?: string | number;
  retailPricePerUnit: string | number;
}

interface MedicineItem {
  id: string;
  brandName: string;
  genericFormula: string;
  category: string;
  barcode: string | null;
  reorderLevel: number;
  batches: BatchItem[];
}

interface CartItem {
  batchId: string;
  medicineId: string;
  brandName: string;
  genericFormula: string;
  batchNumber: string;
  expiryDate: string;
  unitsPerBox: number;
  boxesInStock: number;
  saleType: "UNIT" | "BOX";
  quantity: number;
  unitPrice: number; // Sell / Tab
  boxPrice: number; // Sell / Box
  subtotal: number;
  profitEstimate: number;
}

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MedicineItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountValue, setDiscountValue] = useState<string>("");
  const [discountType, setDiscountType] = useState<"PKR" | "PERCENT">("PKR");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT">("CASH");

  // Customer Khata state
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Focus refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);

  // Barcode USB Hardware Scanner Wedge listener
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        setShowCustomerDropdown((prev) => !prev);
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
        return;
      }
      if (e.key === "F8") {
        e.preventDefault();
        handleCheckout("CASH");
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        handleCheckout("CREDIT");
        return;
      }
      if (e.key === "Escape") {
        setShowCustomerDropdown(false);
        setErrorMessage(null);
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter" && barcodeBuffer.length >= 6) {
        e.preventDefault();
        handleBarcodeScanned(barcodeBuffer);
        barcodeBuffer = "";
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, selectedCustomer, discountValue, discountType]);

  useEffect(() => {
    fetchMedicines("");
    fetchCustomers("");
  }, []);

  const fetchMedicines = async (q: string) => {
    try {
      const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomers = async (q: string) => {
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarcodeScanned = async (code: string) => {
    try {
      const res = await fetch(`/api/medicines/search?barcode=${encodeURIComponent(code)}`);
      if (res.ok) {
        const meds: MedicineItem[] = await res.json();
        if (meds.length > 0 && meds[0].batches.length > 0) {
          addItemToCart(meds[0], meds[0].batches[0], "BOX");
        } else {
          setErrorMessage(`No medicine found for barcode: ${code}`);
        }
      }
    } catch {
      setErrorMessage("Barcode lookup error");
    }
  };

  const addItemToCart = (
    med: MedicineItem,
    batch: BatchItem,
    saleType: "UNIT" | "BOX" = "BOX"
  ) => {
    const existingIndex = cart.findIndex((i) => i.batchId === batch.id && i.saleType === saleType);
    const rawUnit = Number(batch.retailPricePerUnit);
    const rawBox = batch.retailPricePerBox ? Number(batch.retailPricePerBox) : 0;
    const units = batch.unitsPerBox > 0 ? batch.unitsPerBox : 1;
    const unitPrice = rawUnit > 0 ? rawUnit : (rawBox > 0 ? rawBox / units : 0);
    const boxPrice = rawBox > 0 ? rawBox : unitPrice * units;
    const buyPricePerUnit = Number(batch.buyPricePerBox) / batch.unitsPerBox;
    const boxesInStock = Number(batch.boxesInStock);

    if (existingIndex > -1) {
      const updated = [...cart];
      const item = updated[existingIndex];
      const newQty = item.quantity + 1;
      const subtotal = saleType === "BOX" ? newQty * boxPrice : newQty * unitPrice;
      const profit =
        saleType === "BOX"
          ? (boxPrice - Number(batch.buyPricePerBox)) * newQty
          : (unitPrice - buyPricePerUnit) * newQty;

      item.quantity = newQty;
      item.subtotal = subtotal;
      item.profitEstimate = profit;
      setCart(updated);
    } else {
      const qty = 1;
      const subtotal = saleType === "BOX" ? boxPrice : unitPrice;
      const profit =
        saleType === "BOX"
          ? boxPrice - Number(batch.buyPricePerBox)
          : unitPrice - buyPricePerUnit;

      setCart([
        ...cart,
        {
          batchId: batch.id,
          medicineId: med.id,
          brandName: med.brandName,
          genericFormula: med.genericFormula,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          unitsPerBox: batch.unitsPerBox,
          boxesInStock,
          saleType,
          quantity: qty,
          unitPrice,
          boxPrice,
          subtotal,
          profitEstimate: profit,
        },
      ]);
    }
    setErrorMessage(null);
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cart];
    const item = updated[index];
    const subtotal =
      item.saleType === "BOX"
        ? newQty * item.boxPrice
        : newQty * item.unitPrice;

    item.quantity = newQty;
    item.subtotal = subtotal;
    setCart(updated);
  };

  const toggleSaleType = (index: number) => {
    const updated = [...cart];
    const item = updated[index];
    const newType = item.saleType === "BOX" ? "UNIT" : "BOX";
    item.saleType = newType;
    item.subtotal =
      newType === "BOX"
        ? item.quantity * item.boxPrice
        : item.quantity * item.unitPrice;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue("");
    setDiscountType("PKR");
    setErrorMessage(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountNum = parseFloat(discountValue) || 0;
  const calculatedDiscount =
    discountType === "PERCENT"
      ? Number(((subtotal * discountNum) / 100).toFixed(2))
      : Number(discountNum.toFixed(2));
  const totalAmount = Math.max(0, subtotal - calculatedDiscount);

  const handleCheckout = async (chosenPaymentMethod: "CASH" | "CREDIT") => {
    if (cart.length === 0) {
      setErrorMessage("Cart is empty. Select medicines before proceeding.");
      return;
    }

    if (chosenPaymentMethod === "CREDIT" && !selectedCustomer) {
      setErrorMessage("Select a Customer Account for credit (Khata) sale.");
      setShowCustomerDropdown(true);
      return;
    }

    setIsCheckingOut(true);
    setErrorMessage(null);

    try {
      const payloadItems = cart.map((i) => ({
        batchId: i.batchId,
        quantitySoldUnits: i.saleType === "BOX" ? i.quantity * i.unitsPerBox : i.quantity,
        unitPrice: i.unitPrice,
      }));

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer?.id || null,
          paymentMethod: chosenPaymentMethod,
          discount: calculatedDiscount,
          items: payloadItems,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Checkout error");
        setIsCheckingOut(false);
        return;
      }

      const formattedReceipt: ReceiptData = {
        receiptNumber: data.sale.receiptNumber,
        date: new Date().toLocaleString(),
        cashierName: "Terminal Cashier",
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        customerPreviousCredit: selectedCustomer
          ? Number(selectedCustomer.pendingCredit)
          : undefined,
        paymentMethod: chosenPaymentMethod,
        items: cart.map((i) => ({
          brandName: i.brandName,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate,
          quantityUnits: i.quantity,
          isBoxSale: i.saleType === "BOX",
          unitPrice: i.saleType === "BOX" ? i.boxPrice : i.unitPrice,
          subtotal: i.subtotal,
        })),
        subtotal,
        discount: calculatedDiscount,
        discountLabel: discountType === "PERCENT" && discountNum > 0 ? `${discountNum}%` : undefined,
        totalAmount,
      };

      setReceiptData(formattedReceipt);
      setIsReceiptOpen(true);
      clearCart();
      setSelectedCustomer(null);
      fetchMedicines(searchQuery);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process sale");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top POS Action Toolbar */}
      <div className="h-11 bg-zinc-900 border-b border-zinc-800 px-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-1">
          {/* Main Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchMedicines(e.target.value);
              }}
              placeholder="Search Brand Name, Generic Formula, or scan Barcode... [F1]"
              className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-12 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-medium"
            />
            <kbd className="absolute right-2 top-2 text-[9px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-400 px-1 py-0.2 rounded">
              F1
            </kbd>
          </div>

          {/* Customer Khata Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>{selectedCustomer ? selectedCustomer.name : "Walk-in Cash [F2]"}</span>
              {selectedCustomer && (
                <span className="text-[10px] text-amber-400 font-mono ml-1 font-semibold">
                  ({formatCurrency(selectedCustomer.pendingCredit)})
                </span>
              )}
            </button>

            {showCustomerDropdown && (
              <div className="absolute left-0 mt-1 w-64 bg-zinc-900 border border-zinc-800 rounded shadow-xl z-50 p-2 text-xs">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    fetchCustomers(e.target.value);
                  }}
                  placeholder="Filter customer..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 mb-2 text-xs text-zinc-100"
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  <div
                    onClick={() => {
                      setSelectedCustomer(null);
                      setShowCustomerDropdown(false);
                    }}
                    className="p-1.5 hover:bg-zinc-800 rounded cursor-pointer text-zinc-300 font-medium"
                  >
                    Walk-in Cash
                  </div>
                  {customers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowCustomerDropdown(false);
                      }}
                      className="p-1.5 hover:bg-zinc-800 rounded cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <div className="text-zinc-200">{c.name}</div>
                        <div className="text-[10px] text-zinc-500">{c.phone}</div>
                      </div>
                      <div className="text-amber-400 font-mono text-[11px] font-semibold">
                        {formatCurrency(c.pendingCredit)}
                      </div>
                    </div>
                  ))}
                  {customers.length === 0 && (
                    <div className="p-2 text-center text-zinc-500 text-[11px]">
                      No customer accounts yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Shortcut Hints */}
        <div className="hidden lg:flex items-center space-x-3 text-[11px] text-zinc-500 font-mono">
          <span>F3: Box/Tab</span>
          <span>F4: Discount</span>
          <span>F8: Cash (PKR)</span>
          <span>F9: Khata</span>
        </div>
      </div>

      {/* Main POS Split Screen */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left 7 Columns: Medicine Catalog */}
        <div className="col-span-12 lg:col-span-7 border-r border-zinc-800 flex flex-col bg-zinc-950 overflow-hidden">
          <div className="h-8 px-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Product Catalog ({searchResults.length})</span>
            <span>Click "+ Box" or "+ Tab" to add</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {searchResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3 p-6 text-center">
                <Package className="w-10 h-10 text-zinc-700 stroke-1" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-300">No medicines in inventory yet</p>
                  <p className="text-xs text-zinc-500 max-w-sm">
                    Register medicines in the Inventory module or log inward deliveries with Sell/Box and Sell/Tab prices.
                  </p>
                </div>
                <Link
                  href="/inventory"
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded border border-zinc-700 transition-colors"
                >
                  Go to Inventory & Add Medicine
                </Link>
              </div>
            ) : (
              searchResults.map((med) => {
                const totalBoxes = med.batches.reduce(
                  (sum, b) => sum + Number(b.boxesInStock),
                  0
                );
                const isCriticallyLow = isLowStock(totalBoxes, med.reorderLevel);

                return (
                  <div
                    key={med.id}
                    className="p-2.5 rounded border border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-zinc-100">
                            {med.brandName}
                          </span>

                          {isCriticallyLow && (
                            <span className="text-[10px] font-semibold text-red-400 bg-red-950/60 border border-red-900 px-1.5 py-0.2 rounded">
                              Low Stock ({totalBoxes.toFixed(1)} bxs)
                            </span>
                          )}

                          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                            {med.category}
                          </span>
                        </div>

                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Formula: <span className="text-zinc-300">{med.genericFormula}</span>
                          {med.barcode && (
                            <span className="ml-2 font-mono text-zinc-500">[{med.barcode}]</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <span className="font-mono font-semibold text-zinc-200">
                          {totalBoxes.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-zinc-500 ml-1">boxes in stock</span>
                      </div>
                    </div>

                    {/* Batches Table with Box and Tab Rates in PKR */}
                    <div className="mt-2 pt-2 border-t border-zinc-800/60 space-y-1">
                      {med.batches.map((batch) => {
                        const boxes = Number(batch.boxesInStock);
                        const rawUnit = Number(batch.retailPricePerUnit);
                        const rawBox = batch.retailPricePerBox ? Number(batch.retailPricePerBox) : 0;
                        const units = batch.unitsPerBox > 0 ? batch.unitsPerBox : 1;
                        const unitRate = rawUnit > 0 ? rawUnit : (rawBox > 0 ? rawBox / units : 0);
                        const boxRate = rawBox > 0 ? rawBox : unitRate * units;

                        return (
                          <div
                            key={batch.id}
                            className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-zinc-950 border border-zinc-850"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-zinc-300 font-medium">
                                Batch: {batch.batchNumber}
                              </span>
                              <span className="text-zinc-500 text-[10px]">
                                Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                              </span>
                              <span className="text-zinc-400 text-[11px]">
                                {boxes.toFixed(1)} bxs ({batch.unitsPerBox} tabs/bx)
                              </span>
                            </div>

                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-zinc-200 font-medium text-[11px]">
                                {formatCurrency(boxRate)}/box ({formatCurrency(unitRate)}/tab)
                              </span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => addItemToCart(med, batch, "BOX")}
                                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-medium border border-zinc-700"
                                >
                                  + Box
                                </button>
                                <button
                                  onClick={() => addItemToCart(med, batch, "UNIT")}
                                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] border border-zinc-800"
                                >
                                  + Tab
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 5 Columns: Active Cart & Checkout in PKR */}
        <div className="col-span-12 lg:col-span-5 flex flex-col bg-zinc-900/30">
          <div className="h-8 px-3 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center text-xs">
            <span className="font-medium text-zinc-200">
              Active Sale ({cart.length} items)
            </span>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-zinc-400 hover:text-red-400 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="m-2 p-2 rounded bg-red-950/60 border border-red-900 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Cart Table */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs space-y-1">
                <Barcode className="w-6 h-6 stroke-1 text-zinc-700" />
                <span>Ready for scan or item selection</span>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={`${item.batchId}-${item.saleType}`}
                  className="p-2 rounded bg-zinc-900 border border-zinc-800 text-xs flex flex-col gap-1.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-zinc-100">{item.brandName}</div>
                      <div className="text-[10px] text-zinc-500">
                        Bt: {item.batchNumber} • {item.genericFormula}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="text-zinc-500 hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleSaleType(idx)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white"
                        title="Toggle Box vs Tab (F3)"
                      >
                        {item.saleType === "BOX" ? "📦 Box" : "💊 Tab"}
                      </button>

                      <div className="flex items-center border border-zinc-800 rounded bg-zinc-950">
                        <button
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className="px-2 py-0.5 text-zinc-400 hover:text-white text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(idx, parseInt(e.target.value) || 1)
                          }
                          className="w-8 text-center bg-transparent text-zinc-100 font-mono text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className="px-2 py-0.5 text-zinc-400 hover:text-white text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-semibold text-zinc-100 text-xs">
                        {formatCurrency(item.subtotal)}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        @ {formatCurrency(item.saleType === "BOX" ? item.boxPrice : item.unitPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Panel */}
          <div className="p-3 bg-zinc-950 border-t border-zinc-800 space-y-2.5">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span className="font-mono text-zinc-200">{formatCurrency(subtotal)}</span>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-zinc-850">
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="flex items-center gap-1 font-medium">Discount [F4]:</span>

                  <div className="flex items-center space-x-1.5">
                    {/* Mode Toggle: Rs. vs % */}
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => setDiscountType("PKR")}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          discountType === "PKR"
                            ? "bg-zinc-700 text-white font-bold"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                        title="Discount in flat Rupees (PKR)"
                      >
                        Rs.
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("PERCENT")}
                        className={`px-1.5 py-0.5 rounded transition-colors ${
                          discountType === "PERCENT"
                            ? "bg-zinc-700 text-white font-bold"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                        title="Discount in percentage (%)"
                      >
                        %
                      </button>
                    </div>

                    {/* Discount Input */}
                    <input
                      ref={discountInputRef}
                      type="number"
                      step={discountType === "PERCENT" ? "1" : "0.01"}
                      min="0"
                      max={discountType === "PERCENT" ? "100" : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === "PERCENT" ? "0%" : "Rs. 0"}
                      className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-right font-mono text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                {/* Quick % Pills & Live Calculated PKR Amount */}
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500">Quick:</span>
                    {[5, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setDiscountType("PERCENT");
                          setDiscountValue(pct.toString());
                        }}
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-mono transition-colors ${
                          discountType === "PERCENT" && discountValue === pct.toString()
                            ? "bg-amber-950/80 border-amber-700 text-amber-300 font-bold"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                    {discountValue !== "" && (
                      <button
                        type="button"
                        onClick={() => setDiscountValue("")}
                        className="text-zinc-500 hover:text-zinc-300 text-[9px] px-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {calculatedDiscount > 0 && (
                    <span className="font-mono text-emerald-400 font-semibold">
                      -Rs. {calculatedDiscount.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-sm font-semibold text-zinc-100 pt-1 border-t border-zinc-800">
                <span>Net Total (PKR):</span>
                <span className="font-mono text-zinc-100">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Cash / Credit Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCheckout("CASH")}
                disabled={isCheckingOut || cart.length === 0}
                className="py-2 px-3 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Cash Sale (F8)</span>
              </button>

              <button
                onClick={() => handleCheckout("CREDIT")}
                disabled={isCheckingOut || cart.length === 0}
                className="py-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-40"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Credit / Khata (F9)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <ThermalReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        data={receiptData}
      />
    </div>
  );
}
