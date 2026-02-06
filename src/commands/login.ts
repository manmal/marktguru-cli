import { saveConfig } from "../config.js";

interface LoginOptions {
  json?: boolean;
}

interface LoginResult {
  success: boolean;
  apiKey?: string;
  error?: string;
}

const BASE_URL = "https://www.marktguru.at";
const API_BASE = "https://api.marktguru.at/api/v1";
const DEFAULT_ZIP_CODE = "1010";
const MAX_SCRIPTS = 20;

function output(result: LoginResult, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(result));
  } else if (result.success) {
    console.log("\n✓ API key extracted and saved!");
    console.log("  Key:", result.apiKey!.substring(0, 15) + "...");
  } else {
    console.error("\n✗", result.error);
  }
}

async function maybeGetHeaders(): Promise<Record<string, string>> {
  try {
    const { HeaderGenerator } = await import("header-generator");
    const generator = new HeaderGenerator({
      browsers: [{ name: "chrome", minVersion: 110 }],
      devices: ["desktop"],
      operatingSystems: ["macos"],
    });
    return generator.getHeaders({ httpVersion: "2" });
  } catch {
    return {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "accept-encoding": "gzip, deflate, br",
    };
  }
}

async function fetchText(url: string, headers: Record<string, string>): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFirstOk(urls: string[], headers: Record<string, string>) {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      const text = await fetchText(url, headers);
      return { url, text };
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  throw new Error("No URLs to fetch.");
}

function extractScriptUrls(html: string): string[] {
  const urls = new Set<string>();
  const regex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    let src = match[1];
    if (src.startsWith("//")) src = `https:${src}`;
    if (src.startsWith("/")) src = `${BASE_URL}${src}`;
    if (src.startsWith("http")) urls.add(src);
  }
  return [...urls];
}

function findCandidates(text: string): string[] {
  const candidates = new Set<string>();

  const headerRegex = /x-apikey\s*['"]?\s*[:=]\s*['"]([^'"]{10,})['"]/gi;
  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(text))) {
    candidates.add(match[1]);
  }

  const apiKeyRegex = /apiKey\s*[:=]\s*['"]([^'"]{10,})['"]/gi;
  while ((match = apiKeyRegex.exec(text))) {
    candidates.add(match[1]);
  }

  const base64Regex = /[A-Za-z0-9+/]{40,80}={0,2}/g;
  while ((match = base64Regex.exec(text))) {
    const value = match[0];
    if (value.length >= 40 && value.length <= 60 && value.includes("=")) {
      candidates.add(value);
    }
  }

  return [...candidates];
}

async function validateKey(apiKey: string): Promise<boolean> {
  const url = `${API_BASE}/offers/search?as=web&q=test&limit=1&zipCode=${DEFAULT_ZIP_CODE}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        "x-apikey": apiKey,
        "accept": "application/json",
      },
      signal: controller.signal,
    });
    return res.ok;
  } finally {
    clearTimeout(timeout);
  }
}

export async function login(options: LoginOptions): Promise<void> {
  const json = options.json ?? false;
  const log = (msg: string) => !json && console.log(msg);

  log("Extracting Marktguru API key (HTTP-only)...\n");

  try {
    const headers = await maybeGetHeaders();

    const entryUrls = [
      `${BASE_URL}/`,
      `${BASE_URL}/search`,
      `${BASE_URL}/search?q=test`,
      `${BASE_URL}/suche`,
      `${BASE_URL}/suche?q=test`,
    ];

    log("→ Fetching entry HTML...");
    const { url: entryUrl, text: html } = await fetchFirstOk(entryUrls, headers);
    log(`✓ Using entry URL: ${entryUrl}`);

    const candidates = new Set(findCandidates(html));

    const scripts = extractScriptUrls(html).slice(0, MAX_SCRIPTS);
    if (scripts.length === 0) {
      throw new Error("No scripts found to scan for API keys.");
    }

    log(`→ Scanning ${scripts.length} script(s)...`);
    for (const scriptUrl of scripts) {
      try {
        const text = await fetchText(scriptUrl, headers);
        for (const candidate of findCandidates(text)) {
          candidates.add(candidate);
        }
      } catch {
        // Ignore script fetch failures
      }
    }

    for (const candidate of candidates) {
      if (await validateKey(candidate)) {
        await saveConfig({ apiKey: candidate });
        output({ success: true, apiKey: candidate }, json);
        return;
      }
    }

    output(
      {
        success: false,
        error: "Failed to capture a valid API key. The site may have changed.",
      },
      json
    );
    process.exit(1);
  } catch (e) {
    output({ success: false, error: (e as Error).message }, json);
    process.exit(1);
  }
}
