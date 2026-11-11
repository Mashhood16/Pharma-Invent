const fs = require("fs");
const path = require("path");

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function makeDist() {
  console.log("📦 Creating standalone Windows .exe distribution package...");
  const root = path.resolve(__dirname, "..");
  const distDir = path.join(root, "dist", "Pharma-Invent-win32-x64");
  const electronDist = path.join(root, "node_modules", "electron", "dist");

  if (!fs.existsSync(electronDist)) {
    console.error("❌ Electron runtime not found in node_modules.");
    return;
  }

  // 1. Copy Electron binaries to dist
  copyDirSync(electronDist, distDir);

  // 2. Rename electron.exe to Pharma-Invent.exe
  const origExe = path.join(distDir, "electron.exe");
  const targetExe = path.join(distDir, "Pharma-Invent.exe");
  if (fs.existsSync(origExe)) {
    if (fs.existsSync(targetExe)) fs.unlinkSync(targetExe);
    fs.renameSync(origExe, targetExe);
  }

  // 3. Setup resources/app in the standalone folder
  const appTarget = path.join(distDir, "resources", "app");
  if (!fs.existsSync(appTarget)) {
    fs.mkdirSync(appTarget, { recursive: true });
  }

  // Write standalone launcher package.json pointing to main.js
  const appPkg = {
    name: "pharma-invent-pos",
    version: "1.0.0",
    main: "desktop/main.js",
  };
  fs.writeFileSync(path.join(appTarget, "package.json"), JSON.stringify(appPkg, null, 2));

  // Copy desktop folder
  copyDirSync(path.join(root, "desktop"), path.join(appTarget, "desktop"));

  console.log("✅ Standalone Windows .exe created successfully at:");
  console.log("   " + targetExe);
}

makeDist();
