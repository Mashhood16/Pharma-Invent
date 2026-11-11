const packager = require("electron-packager");
const path = require("path");

async function build() {
  console.log("🚀 Starting Windows .exe packaging...");
  try {
    const appPaths = await packager({
      dir: path.resolve(__dirname, ".."),
      name: "Pharma Invent",
      platform: "win32",
      arch: "x64",
      out: path.resolve(__dirname, "..", "dist"),
      overwrite: true,
      asar: false, // keep readable
      ignore: [
        /^\/src-tauri/,
        /^\/drizzle/,
        /^\/\.git/,
        /^\/dist/,
      ],
    });
    console.log("✅ Successfully packaged Windows .exe at:\n", appPaths);
  } catch (err) {
    console.error("❌ Packaging error:", err);
  }
}

build();
