"use client";

import React, { useState, useEffect } from "react";
import { Printer, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PharmacySettings, DEFAULT_SETTINGS } from "@/lib/settings-types";

export interface ReceiptItem {
  brandName: string;
  batchNumber: string;
  expiryDate?: string;
  quantityUnits: number;
  isBoxSale: boolean;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  customerPreviousCredit?: number;
  paymentMethod: "CASH" | "CREDIT";
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  discountLabel?: string;
  totalAmount: number;
}

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  data,
}: ThermalReceiptModalProps) {
  const [settings, setSettings] = useState<PharmacySettings>(DEFAULT_SETTINGS);
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((s) => {
        if (s) {
          setSettings(s);
          if (s.defaultPrinterWidth) {
            setPaperWidth(s.defaultPrinterWidth);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen || !data) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintSuccess(false);

    if (typeof window !== "undefined" && (window as any).desktopAPI?.isDesktop) {
      try {
        const result = await (window as any).desktopAPI.printReceipt({
          paperWidth,
          silent: true,
        });
        if (result.success) {
          setPrintSuccess(true);
        } else {
          window.print();
        }
      } catch {
        window.print();
      }
    } else {
      window.print();
      setPrintSuccess(true);
    }

    setIsPrinting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-100 font-sans">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-sm w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="h-11 px-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-zinc-200 font-medium">
            <Printer className="w-4 h-4 text-zinc-400" />
            <span>Thermal Receipt (PKR)</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-zinc-800 p-0.5 rounded text-[10px] font-mono">
              <button
                onClick={() => setPaperWidth("80mm")}
                className={`px-2 py-0.5 rounded ${
                  paperWidth === "80mm" ? "bg-zinc-700 text-white font-semibold" : "text-zinc-400"
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setPaperWidth("58mm")}
                className={`px-2 py-0.5 rounded ${
                  paperWidth === "58mm" ? "bg-zinc-700 text-white font-semibold" : "text-zinc-400"
                }`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Canvas */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-zinc-950/80">
          <div
            id="thermal-receipt-print-area"
            style={{ width: paperWidth === "58mm" ? "58mm" : "80mm" }}
            className="bg-white text-black p-3 font-mono text-[11px] leading-tight shadow border border-zinc-300"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h1 className="font-bold text-sm tracking-tight uppercase">
                {settings.pharmacyName || "PHARMA INVENT"}
              </h1>
              {settings.tagline && <p className="text-[10px]">{settings.tagline}</p>}
              {settings.address && <p className="text-[10px]">{settings.address}</p>}
              <p className="text-[10px]">
                {settings.phone ? `Tel: ${settings.phone}` : ""}
                {settings.drugSaleLicense ? ` | DSL: ${settings.drugSaleLicense}` : ""}
              </p>
              {settings.ntnNumber && (
                <p className="text-[9px] text-zinc-700">NTN: {settings.ntnNumber}</p>
              )}
            </div>

            {/* Meta */}
            <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-bold">{data.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date/Time:</span>
                <span>{data.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{data.cashierName}</span>
              </div>
              {data.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{data.customerName}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[10px]">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>

              {data.items.map((item, idx) => (
                <div key={idx} className="mb-1 text-[10px]">
                  <div className="font-semibold truncate">
                    {item.brandName}
                  </div>
                  <div className="flex justify-between text-zinc-700 text-[9px]">
                    <span>Bt: {item.batchNumber} {item.isBoxSale ? "(Box)" : "(Tab)"}</span>
                    <span>{item.quantityUnits} @ Rs. {item.unitPrice.toFixed(2)}</span>
                    <span className="font-bold text-black">Rs. {item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2 border-b border-dashed border-black space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rs. {data.subtotal.toFixed(2)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-zinc-700">
                  <span>Discount {data.discountLabel ? `(${data.discountLabel})` : ""}:</span>
                  <span>-Rs. {data.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
                <span>NET PAYABLE:</span>
                <span>Rs. {data.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Payment Mode:</span>
                <span>{data.paymentMethod}</span>
              </div>

              {data.paymentMethod === "CREDIT" && data.customerPreviousCredit !== undefined && (
                <div className="bg-zinc-100 p-1.5 rounded mt-1 border border-zinc-300 text-[9px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Previous Khata:</span>
                    <span>Rs. {data.customerPreviousCredit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>New Total Khata:</span>
                    <span>Rs. {(data.customerPreviousCredit + data.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-2 text-[9px] space-y-0.5 leading-normal">
              <div className="font-mono font-bold text-[10px]">* {data.receiptNumber} *</div>
              <p>{settings.receiptFooter || "Medicines cannot be returned without receipt."}</p>
              <p className="font-semibold pt-0.5">Thank you for your visit!</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-zinc-400 hover:text-white"
          >
            Close (Esc)
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Thermal Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
