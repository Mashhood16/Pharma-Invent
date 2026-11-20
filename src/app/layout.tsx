import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Pharma Invent - Pharmacy POS & Multi-Tenant Inventory System",
  description:
    "High-speed retail medical store Point of Sale, multi-batch expiry tracking, unit conversion, and multi-tenant management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-zinc-950 text-zinc-100 antialiased overflow-hidden selection:bg-zinc-800">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
