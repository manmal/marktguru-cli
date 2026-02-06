import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";

export interface Config {
  apiKey?: string;
  zipCode?: string;
  configPath: string;
}

export const DEFAULT_ZIP_CODE = "1010"; // Vienna

const CONFIG_DIR = join(homedir(), ".marktguru");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export async function getConfig(): Promise<Config> {
  try {
    const data = await readFile(CONFIG_FILE, "utf-8");
    return { ...JSON.parse(data), configPath: CONFIG_FILE };
  } catch {
    return { configPath: CONFIG_FILE };
  }
}

export async function saveConfig(config: Partial<Config>): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  const existing = await getConfig();
  const merged = { ...existing, ...config };
  const { configPath: _configPath, ...persisted } = merged;
  await writeFile(CONFIG_FILE, JSON.stringify(persisted, null, 2));
}
