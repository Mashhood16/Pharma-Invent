import * as XLSX from "xlsx";

export const EXCEL_TEMPLATE_COLUMNS = [
  "Brand Name",
  "Generic Formula",
  "Category",
  "Barcode",
  "Reorder Level",
  "Batch Number",
  "Supplier Name",
  "Expiry Date (YYYY-MM-DD)",
  "Boxes in Stock",
  "Tabs per Box",
  "Buy Price per Box (PKR)",
  "Sell Price per Box (PKR)",
  "Sell Price per Tab (PKR)",
];

export const SAMPLE_TEMPLATE_ROWS = [
  {
    "Brand Name": "Panadol 500mg",
    "Generic Formula": "Paracetamol",
    "Category": "Tablets (Oral)",
    "Barcode": "896400010101",
    "Reorder Level": 2,
    "Batch Number": "B-101",
    "Supplier Name": "GSK Pakistan",
    "Expiry Date (YYYY-MM-DD)": "2027-12-31",
    "Boxes in Stock": 20,
    "Tabs per Box": 100,
    "Buy Price per Box (PKR)": 450,
    "Sell Price per Box (PKR)": 550,
    "Sell Price per Tab (PKR)": 5.50,
  },
  {
    "Brand Name": "Augmentin 625mg",
    "Generic Formula": "Amoxicillin + Clavulanic Acid",
    "Category": "Antibiotics",
    "Barcode": "896400020202",
    "Reorder Level": 2,
    "Batch Number": "AG-882",
    "Supplier Name": "GSK Pakistan",
    "Expiry Date (YYYY-MM-DD)": "2026-11-30",
    "Boxes in Stock": 15,
    "Tabs per Box": 10,
    "Buy Price per Box (PKR)": 380,
    "Sell Price per Box (PKR)": 450,
    "Sell Price per Tab (PKR)": 45.00,
  },
  {
    "Brand Name": "Brufen 400mg",
    "Generic Formula": "Ibuprofen",
    "Category": "Pain Relief / Analgesics",
    "Barcode": "896400030303",
    "Reorder Level": 3,
    "Batch Number": "BF-339",
    "Supplier Name": "Abbott Laboratories",
    "Expiry Date (YYYY-MM-DD)": "2028-05-15",
    "Boxes in Stock": 25,
    "Tabs per Box": 100,
    "Buy Price per Box (PKR)": 500,
    "Sell Price per Box (PKR)": 600,
    "Sell Price per Tab (PKR)": 6.00,
  },
];

export function generateTemplateWorkbook(): Uint8Array {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS, {
    header: EXCEL_TEMPLATE_COLUMNS,
  });

  // Set column widths
  worksheet["!cols"] = [
    { wch: 22 }, // Brand Name
    { wch: 30 }, // Generic Formula
    { wch: 22 }, // Category
    { wch: 16 }, // Barcode
    { wch: 14 }, // Reorder Level
    { wch: 15 }, // Batch Number
    { wch: 24 }, // Supplier Name
    { wch: 24 }, // Expiry Date
    { wch: 15 }, // Boxes in Stock
    { wch: 14 }, // Tabs per Box
    { wch: 22 }, // Buy Price per Box
    { wch: 22 }, // Sell Price per Box
    { wch: 22 }, // Sell Price per Tab
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Template");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}
