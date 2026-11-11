const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  isDesktop: true,
  platform: process.platform,

  // Window Controls
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),

  // Hardware: Local Thermal Printer (58mm / 80mm ESC/POS)
  printReceipt: (options) => ipcRenderer.invoke("print-thermal-receipt", options),
  getPrinters: () => ipcRenderer.invoke("get-system-printers"),

  // Hardware: Cash Drawer Kick
  openCashDrawer: () => ipcRenderer.invoke("open-cash-drawer"),

  // Hardware: USB Barcode Scanner listener
  onBarcodeScanned: (callback) => {
    const subscription = (_event, barcode) => callback(barcode);
    ipcRenderer.on("barcode-scanned", subscription);
    return () => ipcRenderer.removeListener("barcode-scanned", subscription);
  },
});
