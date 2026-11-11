"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, CheckCircle2, Printer } from "lucide-react";
import { PharmacySettings, DEFAULT_SETTINGS } from "@/lib/settings-types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<PharmacySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Failed to save settings.");
      }
    } catch {
      alert("Error saving settings.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
        Loading pharmacy settings...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-y-auto font-sans">
      {/* Top Header */}
      <div className="h-12 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-zinc-400" />
          <h1 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Pharmacy Store & Receipt Branding Settings
          </h1>
        </div>

        {saved && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl">
        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4 text-xs">
          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3">
            <h2 className="font-semibold text-zinc-200 text-sm border-b border-zinc-800 pb-2">
              Store Identity & Licensing
            </h2>

            <div>
              <label className="block text-zinc-400 mb-1">Pharmacy / Store Name *</label>
              <input
                type="text"
                required
                value={settings.pharmacyName}
                onChange={(e) => setSettings({ ...settings, pharmacyName: e.target.value })}
                placeholder="e.g. Al-Shifa Pharmacy"
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-medium"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Tagline / Subheading</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                placeholder="e.g. Chemists & Druggists"
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Store Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="e.g. Shop # 4, Commercial Market, Lahore"
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="e.g. 0300-1234567"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Drug Sale License (DSL #)</label>
                <input
                  type="text"
                  value={settings.drugSaleLicense}
                  onChange={(e) => setSettings({ ...settings, drugSaleLicense: e.target.value })}
                  placeholder="e.g. DSL-01-2024"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">NTN / Tax Registration Number</label>
              <input
                type="text"
                value={settings.ntnNumber}
                onChange={(e) => setSettings({ ...settings, ntnNumber: e.target.value })}
                placeholder="e.g. NTN-1234567-8"
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3">
            <h2 className="font-semibold text-zinc-200 text-sm border-b border-zinc-800 pb-2">
              Thermal Receipt Print Configuration
            </h2>

            <div>
              <label className="block text-zinc-400 mb-1">Default Paper Roll Width</label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 text-zinc-300 cursor-pointer">
                  <input
                    type="radio"
                    name="paperWidth"
                    value="80mm"
                    checked={settings.defaultPrinterWidth === "80mm"}
                    onChange={() => setSettings({ ...settings, defaultPrinterWidth: "80mm" })}
                  />
                  <span>80mm (Standard POS Thermal Roll)</span>
                </label>
                <label className="flex items-center space-x-2 text-zinc-300 cursor-pointer">
                  <input
                    type="radio"
                    name="paperWidth"
                    value="58mm"
                    checked={settings.defaultPrinterWidth === "58mm"}
                    onChange={() => setSettings({ ...settings, defaultPrinterWidth: "58mm" })}
                  />
                  <span>58mm (Compact Mobile Roll)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Receipt Footer Note / Return Policy</label>
              <textarea
                rows={3}
                value={settings.receiptFooter}
                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                placeholder="Terms and conditions printed at the bottom of customer receipts"
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded text-xs flex items-center space-x-2 transition-colors shadow"
            >
              <Save className="w-4 h-4" />
              <span>Save Pharmacy Settings</span>
            </button>
          </div>
        </form>

        {/* Live Thermal Receipt Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span>Live Receipt Preview ({settings.defaultPrinterWidth})</span>
          </div>

          <div
            style={{ width: settings.defaultPrinterWidth === "58mm" ? "220px" : "300px" }}
            className="bg-white text-black p-3.5 rounded shadow-2xl font-mono text-[10px] leading-tight border border-zinc-300 select-none"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h1 className="font-bold text-xs uppercase tracking-tight">
                {settings.pharmacyName || "PHARMACY NAME"}
              </h1>
              {settings.tagline && <p className="text-[9px] text-zinc-700">{settings.tagline}</p>}
              {settings.address && <p className="text-[9px] text-zinc-700">{settings.address}</p>}
              <p className="text-[9px] text-zinc-800 pt-0.5">
                {settings.phone ? `Tel: ${settings.phone}` : ""}
                {settings.drugSaleLicense ? ` | DSL: ${settings.drugSaleLicense}` : ""}
              </p>
              {settings.ntnNumber && (
                <p className="text-[8px] text-zinc-600">NTN: {settings.ntnNumber}</p>
              )}
            </div>

            {/* Meta */}
            <div className="py-2 border-b border-dashed border-black text-[9px] space-y-0.5">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-bold">REC-20261110-001</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date().toLocaleDateString("en-PK")}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>Admin Terminal</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>Walk-in Cash</span>
              </div>
            </div>

            {/* Items */}
            <div className="py-2 border-b border-dashed border-black">
              <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[9px]">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span>Panadol 500mg (10 tabs)</span>
                <span>10 x 3.50</span>
                <span>Rs. 35.00</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span>Augmentin 625mg (1 Box)</span>
                <span>1 x 450.00</span>
                <span>Rs. 450.00</span>
              </div>
            </div>

            {/* Total */}
            <div className="py-2 border-b border-dashed border-black space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>NET TOTAL:</span>
                <span>Rs. 485.00</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span>Payment Mode:</span>
                <span>CASH</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 text-center text-[8px] leading-normal text-zinc-700">
              <p>{settings.receiptFooter}</p>
              <p className="pt-1 font-semibold">Thank you for your visit!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
