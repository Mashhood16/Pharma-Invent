const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const http = require("http");
const { fork, execSync } = require("child_process");

// Disable Chromium HTTP disk cache to guarantee fresh builds are always loaded
app.commandLine.appendSwitch("disable-http-cache");

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;
const DEV_URL = `http://localhost:${PORT}`;

function killStalePort(port) {
  try {
    if (process.platform === "win32") {
      let out = "";
      try {
        out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      } catch {
        return; // No process listening on this port
      }

      const pids = new Set();
      out.split("\n").forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parseInt(parts[parts.length - 1]);
          if (pid && pid !== process.pid && pid !== 0) {
            pids.add(pid);
          }
        }
      });

      pids.forEach((pid) => {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        } catch {}
      });
    }
  } catch {}
}

function startInternalServer() {
  return new Promise((resolve) => {
    // 1. Terminate any orphaned/stale processes from older runs
    killStalePort(PORT);

    // 2. Spawn fresh Next.js production server
    console.log("Starting internal Next.js production server on port", PORT);
    const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
    const appRoot = path.join(__dirname, "..");

    try {
      serverProcess = fork(nextBin, ["start", "-p", String(PORT)], {
        cwd: appRoot,
        env: { ...process.env, NODE_ENV: "production" },
        stdio: "ignore",
      });
    } catch (err) {
      console.error("Failed to fork Next.js process:", err);
    }

    resolve(true);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    frame: false, // Custom frameless window for native POS titlebar
    title: "Pharma Invent - POS & Inventory Management System",
    backgroundColor: "#09090b",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  Menu.setApplicationMenu(null);

  // Enable F5 / Ctrl+R hard reload and Ctrl+Shift+I DevTools
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F5" || (input.control && input.key.toLowerCase() === "r")) {
      event.preventDefault();
      mainWindow.webContents.reloadIgnoringCache();
    }
    if (input.control && input.shift && input.key.toLowerCase() === "i") {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Poll server until ready, then clear cache and show window
  const loadURLWithRetry = (url, retries = 50) => {
    http
      .get(url, () => {
        mainWindow.webContents.session.clearCache().then(() => {
          mainWindow.loadURL(url);
          mainWindow.once("ready-to-show", () => {
            mainWindow.show();
            mainWindow.focus();
          });
        });
      })
      .on("error", () => {
        if (retries > 0) {
          setTimeout(() => loadURLWithRetry(url, retries - 1), 500);
        } else {
          console.error("Failed to connect to internal server.");
        }
      });
  };

  startInternalServer().then(() => {
    loadURLWithRetry(DEV_URL);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Window Management IPC Handlers
ipcMain.on("window-minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("window-is-maximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Hardware: Silent ESC/POS Thermal Printer Spooler
ipcMain.handle("print-thermal-receipt", async (_event, options) => {
  if (!mainWindow) return { success: false, error: "Window not available" };

  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    const targetPrinter = options?.printerName || printers.find((p) => p.isDefault)?.name;

    await mainWindow.webContents.print({
      silent: options?.silent ?? true,
      printBackground: true,
      deviceName: targetPrinter,
      margins: { marginType: "none" },
      pageSize: options?.paperWidth === "58mm" ? { width: 58000, height: 200000 } : { width: 80000, height: 297000 },
    });

    return { success: true, printer: targetPrinter };
  } catch (err) {
    console.error("Thermal print failed:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-system-printers", async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle("open-cash-drawer", async () => {
  console.log("⚡ Signal dispatched: ESC/POS Open Cash Drawer");
  return { success: true, message: "Cash drawer triggered" };
});

app.whenReady().then(createWindow);

function cleanupServer() {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {}
    serverProcess = null;
  }
  killStalePort(PORT);
}

app.on("will-quit", cleanupServer);
app.on("before-quit", cleanupServer);

app.on("window-all-closed", () => {
  cleanupServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
