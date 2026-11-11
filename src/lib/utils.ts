import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formats amount strictly in Pakistani Rupee (PKR / Rs.)
export function formatCurrency(amount: number | string | null | undefined): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) : (amount || 0);
  return `Rs. ${numeric.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isLowStock(boxesInStock: number | string, threshold = 2): boolean {
  const num = typeof boxesInStock === "string" ? parseFloat(boxesInStock) : boxesInStock;
  return num <= threshold;
}

export function isExpired(expiryDate: Date | string): boolean {
  const exp = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  exp.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return exp <= now;
}

export function daysUntilExpiry(expiryDate: Date | string): number {
  const exp = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  exp.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = exp.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Standard Pharmaceutical Categories for Retail & Hospital Pharmacies
export const PHARMACY_CATEGORIES = [
  "Tablets (Oral)",
  "Capsules",
  "Syrups / Suspensions (Oral Liquids)",
  "Injections (Vials & Ampoules)",
  "Drops (Eye, Ear & Nasal)",
  "Creams / Ointments / Gels (Topical)",
  "Inhalers & Respiratory",
  "Antibiotics",
  "Painkillers / Analgesics / NSAIDs",
  "Cardiovascular & Anti-Hypertensives",
  "Anti-Diabetic",
  "Gastrointestinal / Antacids / PPIs",
  "Pediatric Care",
  "Surgicals & Disposables (Cannulas, Syringes)",
  "Infusions & IV Fluids",
  "Suppositories",
  "Multivitamins & Dietary Supplements",
  "Dermatology & Skin Care",
  "Dental / Oral Care",
  "Vaccines & Biologicals",
  "General / Other",
] as const;
