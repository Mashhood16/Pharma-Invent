import fs from "fs";
import path from "path";
import { PharmacySettings, DEFAULT_SETTINGS } from "./settings-types";

export * from "./settings-types";

const SETTINGS_FILE = path.join(process.cwd(), "pharmacy-settings.json");

export function getPharmacySettings(): PharmacySettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading pharmacy settings:", err);
  }
  return DEFAULT_SETTINGS;
}

export function savePharmacySettings(settings: Partial<PharmacySettings>): PharmacySettings {
  const current = getPharmacySettings();
  const updated = { ...current, ...settings };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing pharmacy settings:", err);
  }
  return updated;
}
