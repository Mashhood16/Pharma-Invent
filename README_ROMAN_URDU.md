# 🏥 Pharma Invent - Medical Store POS & Inventory Management System
## Mukammal Roman Urdu Guide (Software Chalane Ka Aasan Tareeqa)

**Pharma Invent** Pakistan ke retail medical stores, pharmacies, aur hospital dispensaries ke liye banaya gaya ek fast aur professional Windows desktop software hai. Is me zero dummy data hai, currency **Pakistani Rupee (Rs. / PKR)** me hai, aur barcode scanner aur thermal receipt printer ki mukammal support shamil hai.

---

## 📑 Fehris (Table of Contents)
1. [Software Ko Start / Open Kaise Karein?](#1-software-ko-start--open-kaise-karein)
2. [Login Credentials (Username aur Password)](#2-login-credentials)
3. [Nayi Medicine Add Karna (Inventory Management)](#3-nayi-medicine-add-karna-inventory-management)
4. [Excel Sheet Ke Zariye Bulk Stock Upload Karna](#4-excel-sheet-ke-zariye-bulk-stock-upload-karna)
5. [Point of Sale (POS) aur Fast Checkout](#5-point-of-sale-pos-aur-fast-checkout)
6. [Discount Lagane Ka Tareeqa (Rupees ya Percentage)](#6-discount-lagane-ka-tareeqa-rupees-ya-percentage)
7. [Customer Khata (Udhaar) aur Cash Wasooli](#7-customer-khata-udhaar-aur-cash-wasooli)
8. [Distributor / Supplier Payouts (Khareedari Ka Hisaab)](#8-distributor--supplier-payouts-khareedari-ka-hisaab)
9. [Expiry Tracking aur RTV (Return to Vendor)](#9-expiry-tracking-aur-rtv-return-to-vendor)
10. [Day-End Z-Report (Rozana Galla / Cash Drawer Closing)](#10-day-end-z-report-rozana-galla--cash-drawer-closing)
11. [Reorder Sheet (Low Stock WhatsApp Par Order Karna)](#11-reorder-sheet-low-stock-whatsapp-par-order-karna)
12. [Store Settings aur Apni Pharmacy Ka Naam Print Karna](#12-store-settings-aur-apni-pharmacy-ka-naam-print-karna)
13. [Ghalat Sale Transaction Ko Cancel / Delete Karna](#13-ghalat-sale-transaction-ko-cancel--delete-karna)
14. [Keyboard Shortcuts Ki Mukammal List](#14-keyboard-shortcuts-ki-mukammal-list)

---

## 1. Software Ko Start / Open Kaise Karein?

Aapko koi command prompt ya terminal kholne ki zaroorat nahi hai. Yeh mukammal Windows Software hai.

* Folder me jayein: `c:\Users\mashh\Downloads\Pharma Invent\`
* File par double-click karein:
  ```text
  Pharma-Invent.exe
  ```
* Software bina kisi black window ke direct aapke samne desktop screen par open ho jaye ga.

> **Tip:** Agar aap chaho to `Pharma-Invent.exe` par Right-Click kar ke **"Send to Desktop (Create shortcut)"** bana sakte hain taake aap desktop se direct chala sakein.

---

## 2. Login Credentials

Jab software khule ga, Login screen par yeh details enter karein:
* **Username:** `admin`
* **Password:** `admin123`
* Phir **"Sign In to Terminal"** button dabayein.

---

## 3. Nayi Medicine Add Karna (Inventory Management)

Left side ke menu se **"Medicine Inventory"** par click karein.

1. Upar right side par **"+ Add Medicine"** button dabayein.
2. Form me details bharein:
   - **Brand Name:** Medicine ka naam (maslan: `Panadol 500mg`).
   - **Generic Formula:** Active salt formula (maslan: `Paracetamol`).
   - **Category:** Dropdown list me se category select karein (maslan: `Tablets (Oral)`, `Syrups`, `Injections`, `Antibiotics` waghera).
   - **Barcode:** Agar dabbe par barcode hai to scanner se scan karein ya haath se likhein.
   - **Reorder Level:** Kitne dabbe reh jayein to red alert aaye (default `2` dabbe).
3. **Initial Batch & Pricing (PKR):**
   - **Batch Number:** Manufacturer batch code (maslan: `B-101`).
   - **Boxes in Stock:** Kitne dabbe dukan me mojood hain (maslan: `10`).
   - **Tabs/Units per Box:** Ek dabbe me kitni goliyan/strips hain (maslan: `100`).
   - **Buy / Box (PKR):** Distributor se dabba kitne ka khareeda (maslan: `500`).
   - **Sell / Box (PKR):** Poora dabba kitne ka bechna hai (maslan: `600`).
   - **Sell / Tab (PKR) (Auto-Math):** 
     > 💡 **Zabardast Feature:** Aapko per-tablet hisaab lagane ki zaroorat nahi hai! Sirf `Sell / Box` (600) aur `Tabs per Box` (100) likhein, software foran khud hi calculate kar ke `Rs. 6.00` likh de ga:
     > $$\text{Sell per Tab} = \frac{\text{Sell per Box}}{\text{Tabs per Box}} = \frac{600}{100} = 6.00$$
4. **"Save Product"** dabayein. Medicine stock me shamil ho jaye gi.

### Medicine Delete Karna:
Agar koi medicine ghalti se add ho gayi ho ya dukan se khatam karni ho to table me aakhri column me **Trash (Dustbin)** icon par click karein, aur Confirm karein. Medicine aur uske batches permanently delete ho jayein ge.

---

## 4. Excel Sheet Ke Zariye Bulk Stock Upload Karna

Agar aapke paas sainkaron ya hazaron medicines ka stock Excel me mojood hai, to ek ek kar ke enter karne ki zaroorat nahi hai:

1. **"Medicine Inventory"** screen par jayein.
2. Upar **"Bulk Upload"** button par click karein.
3. **Step 1:** **"Download Template (.xlsx)"** button dabayein. Aapke computer me `pharma-inventory-template.xlsx` download ho jaye gi.
4. Excel me template file open karein. Is me tamam zaroori column headers pehle se bane hue hain:
   * `Brand Name`
   * `Generic Formula`
   * `Category`
   * `Barcode`
   * `Batch Number`
   * `Supplier Name`
   * `Expiry Date (YYYY-MM-DD)`
   * `Boxes in Stock`
   * `Tabs per Box`
   * `Buy Price per Box (PKR)`
   * `Sell Price per Box (PKR)`
   * `Sell Price per Tab (PKR)` *(Isko khali chor dein ge to software khud calculate kar lega)*
5. **Step 2:** File save kar ke Bulk Upload modal me file ko select ya drag karein.
6. Screen par preview table me tamam medicines nazar aa jayein gi.
7. **"Import Products into Stock"** dabayein. Chand seconds me sara stock inventory me shamil ho jaye ga.

---

## 5. Point of Sale (POS) aur Fast Checkout

Menu me **"Point of Sale"** par click karein (ya keyboard se `F1` dabayein). Yeh screen dukan par fast sale karne ke liye design ki gayi hai.

### Sale Karne Ka Tareeqa:
1. **Medicine Search:**
   - Barcode scanner se dabbe ka barcode scan karein (foran cart me add ho jaye ga).
   - Ya keyboard se `F1` dabayein aur medicine ka naam ya formula type karein (maslan: `Pana` likhne par Panadol ke tamam batches aa jayein ge).
2. **Dabba ya Khuli Goli (Box vs Unit):**
   - Cart me har item ke aage **"Box"** ya **"Unit"** ka button hai.
   - `Box` select karein ge to poore dabbe ki qeemat lage gi.
   - `Unit` select karein ge to loose tablet/strip ki qeemat lage gi (maslan 5 goliyan bechni hon).
   - Keyboard se `F3` daba kar bhi Box/Tab toggle kar sakte hain.
3. **Quantity:** `+` aur `-` dabayein ya direct number type karein.
4. **Payment Select Karein:**
   - **Cash Sale (`F8`):** Cash sale complete ho jaye gi aur Thermal Receipt samne aa jaye gi.
   - **Credit / Khata Sale (`F9`):** Pehle `F2` daba kar customer account select karein, phir `F9` dabayein. Sale customer ke udhaar khate me darj ho jaye gi.
5. **Receipt Print:**
   - Receipt screen par `Enter` ya **"Print Thermal Receipt"** dabayein.
   - ESC/POS thermal printer (80mm ya 58mm) se foran parchi print ho kar nikal aaye gi.

---

## 6. Discount Lagane Ka Tareeqa (Rupees ya Percentage)

Gahak ko discount dene ke liye POS cart ke neechay discount ka box mojood hai:

1. Keyboard se **`F4`** dabayein. Cursor direct discount ke box me chala jaye ga.
2. Aap do tareeqon se discount de sakte hain:
   * **Rupees Mode (`Rs.`):** Agar seedha `50` likhein ge to kul bill me se **Rs. 50** kam ho jayein ge.
   * **Percentage Mode (`%`):** Agar `%` button daba kar `10` likhein ge to kul bill ka **10%** discount nikal aayega (maslan Rs. 500 ke bill par Rs. 50 discount).
3. **Quick Discount Pills:** 
   - Speed se kaam karne ke liye **`[ 5% ]`**, **`[ 10% ]`**, **`[ 15% ]`** ke button par click karein.
4. Receipt par discount ki mukammal tafseel print hoti hai (maslan: `Discount (10%): -Rs. 50.00`).

---

## 7. Customer Khata (Udhaar) aur Cash Wasooli

Menu se **"Customer Accounts"** par click karein. Yahan aapke regular mareezon ka khata maintain hota hai.

### Naya Khata Kholna:
* Upar **"+ Add Account"** dabayein.
* Patient ka Naam, Phone number, aur purana baqaya (agar koi hai) daal kar save karein.

### Khata Se Cash Wasooli (Receive Payment):
Jab koi mareez apna udhaar chukane ya jama karwane aaye:
1. Customer table me us mareez ke naam ke aage **"Receive"** button par click karein.
2. Modal khule ga jahan uska **Kul Udhaar (Outstanding Debt)** nazar aayega.
3. Jitne paise usne diye (maslan: `Rs. 1000`), woh raqam enter karein.
4. Payment mode select karein (*Cash, Bank Transfer, EasyPaisa/JazzCash*).
5. **"Record Payment"** dabayein.
   - Mareez ka baqaya khata foran kam ho jaye ga.
   - Yeh cash aaj ke rozana galle (Day-End Drawer) me automatically jama ho jaye ga.

---

## 8. Distributor / Supplier Payouts (Khareedari Ka Hisaab)

Menu se **"Suppliers & Vendors"** par click karein. Yahan tamam pharmaceutical distributors (Abbott, GSK, Searle, Getz waghera) ka hisaab kitaab rehta hai.

### Distributor Ko Payment Dena (Pay Supplier):
Jab distributor ka order booker ya delivery man payment lene aaye:
1. Distributor ke naam ke aage **"Pay"** button dabayein.
2. Distributor ka baqaya payable balance samne aayega.
3. Jitne paise aapne diye (maslan: `Rs. 5000`), woh enter karein.
4. Payment mode select karein (*Cash from Register, Cheque, Bank Transfer*).
5. **"Record Payment"** dabayein.
   - Distributor ka balance kam ho jaye ga.
   - Agar aapne cash dukan ke galle se diya hai to Day-End report me galle se minus ho jaye ga.

---

## 9. Expiry Tracking aur RTV (Return to Vendor)

Menu se **"Expiry & RTV Returns"** par click karein.

* **Expired Medicines:** Jo medicines expire ho chuki hain, unki red list yahan aati hai, aur unke kitne dabbe shelf par paray hain woh quantity dikhti hai.
* **Return to Vendor (RTV):** 
  - Expired item ke aage **"Process RTV Claim"** button dabayein.
  - Software un dabbon ko inventory se nikaal de ga aur unki wholesale qeemat distributor ke account se claim ke tor par adjust kar de ga.
* **Near-Expiry Warning:** Agle 30 se 60 dinon me expire hone wali medicines pehle hi samne aa jati hain taake staff unhein pehle bech sakay (FEFO: First Expired, First Out).

---

## 10. Day-End Z-Report (Rozana Galla / Cash Drawer Closing)

Dukan band karte waqt rozana cash tally karna aur check karna ke galle me kitne paise hone chahiye:

1. Menu se **"Financial Analytics"** me jayein.
2. Upar peele rang ka **"Day-End Z-Report"** button dabayein.
3. Software aaj ke din ka mukammal hisaab nikal kar layega:
   - `+` **Aaj Ki Cash Sale (Cash Receipts)**
   - `+` **Khata Se Aayi Hui Cash Wasooli (Customer Payments)**
   - `-` **Distributor Ko Diye Gaye Cash Payouts**
   - `=` **Galle Me Expected Cash (Net Expected Drawer Cash)**
4. **Physical Cash Verification:**
   - Dukan ke galle ke note gin kar **"Count Physical Cash in Drawer"** me likhein.
   - Software foran bata de ga:
     * **Balanced (✓ Rs. 0.00)**: Hisaab bilkul barabar hai.
     * **Over (+Rs. ...)**: Galle me paise zyada hain.
     * **Short (-Rs. ...)**: Galle me paise kam hain.
5. **"Print Daily Z-Report Slip"** dabayein taake receipt printer se rozana ka closing voucher print ho kar record me lag jaye.

---

## 11. Reorder Sheet (Low Stock WhatsApp Par Order Karna)

Jab distributor ka booker aaye aur aapko check karna ho ke dukan me kya kya khatam ho raha hai:

1. **"Medicine Inventory"** me jayein.
2. Upar **"Reorder Sheet (Low Stock)"** button dabayein.
3. Yahan tamam woh medicines aa jayein gi jinke dabbe `2` ya `1` reh gaye hain.
4. **"Copy for WhatsApp"** button dabayein:
   - Ek click se professional order list copy ho jaye gi.
   - Ab WhatsApp open karein aur distributor booker ko paste kar ke bhej dein:
     ```text
     *PHARMACY PURCHASE REORDER SHEET*
     Date: 10/11/2026
     Total Items to Reorder: 2
     --------------------------------------
     1. *Panadol 500mg* (Paracetamol) - Stock Left: 1 bxs -> Order: 10 Boxes
     2. *Augmentin 625mg* (Co-Amoxiclav) - Stock Left: 0 bxs -> Order: 10 Boxes
     --------------------------------------
     Please book order and confirm delivery schedule.
     ```
5. Ya **"Print PO"** daba kar purchase order parchi print nikaal lein.

---

## 12. Store Settings aur Apni Pharmacy Ka Naam Print Karna

Menu se **"⚙️ Store Settings"** par click karein.

Yahan aap apni dukan ki details daalein jo thermal receipt par print hongi:
* **Pharmacy / Store Name:** (Maslan: `Al-Shifa Pharmacy & Medical Store`)
* **Tagline:** (Maslan: `Licensed Chemists & Druggists`)
* **Store Address:** (Maslan: `Shop # 5, Main Market, Gulberg, Lahore`)
* **Phone / WhatsApp:** (Maslan: `0300-1234567`)
* **Drug Sale License (DSL #):** (Maslan: `DSL-LHR-2026-9901`)
* **NTN Number:** (Maslan: `NTN-4819201-3`)
* **Default Printer Width:** `80mm` ya `58mm` select karein.
* **Receipt Footer / Return Policy:** (Maslan: `Khareedi hui dawai 3 din me raseed ke sath wapas hogi. Fridge wali items wapas nahi hongi.`)

> Screen ke right side par **Live Receipt Preview** mojood hai. Jaise jaise aap likhein ge, samne receipt par wahi print hota hua dikhe ga. Aakhir me **"Save Pharmacy Settings"** daba dein.

---

## 13. Ghalat Sale Transaction Ko Cancel / Delete Karna

Agar cashier ne ghalti se koi raseed galat kaat di ho:

1. Menu se **"Financial Analytics"** me jayein.
2. Neechay **"Sales & Margin Audit Ledger"** table me tamam raseedein nazar aa rahi hain.
3. Jis raseed ko cancel karna ho, uske aakhri column me **Trash (Delete)** button dabayein.
4. Software aap se confirmation mangay ga:
   * **Stock Auto-Restore:** Jo goliyan/dabbe is sale me bike thay, woh foran wapas inventory stock me jama ho jayein ge.
   * **Khata Auto-Adjust:** Agar udhaar par sale hui thi to customer ke khate se raqam nikaal di jaye gi.
   * **Financials Recalculate:** Aaj ki kul sale aur profit foran theek ho jaye ga.

---

## 14. Keyboard Shortcuts Ki Mukammal List

POS counter par mouse ke baghair tez tareen kaam karne ke liye yeh shortcuts istemaal karein:

| Key | Kaam (Action) |
|---|---|
| **F1** | Medicine Search bar par cursor le jayein |
| **F2** | Customer Khata dropdown open / close karein |
| **F3** | Cart ke item ko Box (Dabba) ya Tab (Goli) me toggle karein |
| **F4** | Discount field par jump karein (Rs. ya %) |
| **F8** | Cash Sale complete karein aur receipt print karein |
| **F9** | Customer ke Khate (Credit) par sale darj karein |
| **F5** ya **Ctrl + R** | Software ki screen ko fresh / reload karein |
| **Esc** | Khole hue modal ya parchi ko band karein |

---

## 📞 Madad aur Support

Agar aapko kisi kism ka masla pesh aaye:
* Software ko restart karne ke liye window ko close karein aur dobara `Pharma-Invent.exe` double-click karein.
* Software background processes ko khud hi handle karta hai aur port ko clean rakhta hai.
* Tamam hisaab kitaab **Pakistani Rupee (Rs.)** me mehfooz rehta hai.
