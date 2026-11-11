export interface PharmacySettings {
  pharmacyName: string;
  tagline: string;
  address: string;
  phone: string;
  drugSaleLicense: string;
  ntnNumber: string;
  receiptFooter: string;
  defaultPrinterWidth: "58mm" | "80mm";
}

export const DEFAULT_SETTINGS: PharmacySettings = {
  pharmacyName: "AL-SHIFA PHARMACY",
  tagline: "Medical Store & Dispensary",
  address: "Shop # 1, Main Market, Lahore, Pakistan",
  phone: "+92 300 1234567",
  drugSaleLicense: "DSL-PK-2026-0811",
  ntnNumber: "NTN-7819201-4",
  receiptFooter: "Medicines cannot be returned without receipt within 3 days. Refrigerated items are non-returnable.",
  defaultPrinterWidth: "80mm",
};
