# Pharma Invent — Enterprise Pharmacy POS & Inventory Management (Windows Software)

**Pharma Invent** is a Point of Sale (POS) and Multi-Batch Inventory Management System engineered for retail pharmacies, medical stores, and hospital dispensaries on Windows.

---

## 🖥️ Standalone Windows Executable (.exe)

You now have a **native Windows `.exe` executable**:

### 🎯 How to Launch:
Simply double-click:
```text
Pharma-Invent.exe
```
located directly in the project root folder `c:\Users\mashh\Downloads\Pharma Invent\Pharma-Invent.exe`!

- **No black console/terminal window**: Compiles with `/target:winexe` so it launches cleanly like any standard commercial Windows application.
- **Automatic Engine Lifecycle**: Automatically checks and starts the internal service, opens the native window, and terminates background services when you exit the app.
- **Standalone Distribution**: A self-contained portable distribution is also compiled at:
  ```text
  dist\Pharma-Invent-win32-x64\Pharma-Invent.exe
  ```

---

## ⚡ Master Login Credentials

- **Username**: `admin`
- **Password**: `admin123`

---

## 🛠️ Features & Modules

1. **Unit Economics & Pricing in PKR**:
   - **Buy / Box (PKR)**
   - **Sell / Box (PKR)**
   - **Sell / Tab (PKR)**
   - Real-time auto-calculation ($\text{Sell/Box} = \text{Sell/Tab} \times \text{Tabs/Box}$).
2. **Category Dropdown**:
   - All 21 standard pharmaceutical categories (`Tablets`, `Capsules`, `Syrups`, `Injections`, `Drops`, `Creams`, `Antibiotics`, `Pediatric`, etc.).
3. **Delete Medicine**:
   - Option to permanently delete medicines and their batches from inventory.
4. **Currency**:
   - Displayed and calculated throughout in **Pakistani Rupee (Rs. / PKR)**.
5. **Zero Dummy Data**:
   - Clean slate database ready for actual inventory stock entry.
6. **Point of Sale (POS)**:
   - Optimized for keyboard navigation (`F1` Search, `F2` Customer Khata, `F3` Box/Tab, `F4` Discount, `F8` Cash, `F9` Credit).
   - USB Hardware Barcode Scanner auto-listener.
   - 58mm & 80mm ESC/POS thermal receipt printing.
7. **Purchases & Stock-In**:
   - Log deliveries by supplier with invoice numbers, boxes, and wholesale purchase costs.
8. **Expiry & Return to Vendor (RTV)**:
   - Track batches past expiry date and pull them from shelves.
