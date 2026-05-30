import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";

export interface Config {
  apiKey?: string;
  zipCode?: string;
  country?: string;
  configPath: string;
}

export const DEFAULT_ZIP_CODE = "1010"; // Vienna
export const DEFAULT_COUNTRY = "at";
export const VALID_COUNTRIES = ["at", "de"] as const;
export type Country = (typeof VALID_COUNTRIES)[number];

const CONFIG_DIR = join(homedir(), ".marktguru");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export async function getConfig(): Promise<Config> {
  try {
    const data = await readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return { country: DEFAULT_COUNTRY, ...parsed, configPath: CONFIG_FILE };
  } catch {
    return { country: DEFAULT_COUNTRY, configPath: CONFIG_FILE };
  }
}

export async function saveConfig(config: Partial<Config>): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  const existing = await getConfig();
  const merged = { ...existing, ...config };
  const { configPath: _configPath, ...persisted } = merged;
  await writeFile(CONFIG_FILE, JSON.stringify(persisted, null, 2));
}
