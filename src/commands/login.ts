import { saveConfig } from "../config.js";
import { extractApiKey } from "../auth.js";

interface LoginOptions {
  json?: boolean;
}

interface LoginResult {
  success: boolean;
  apiKey?: string;
  error?: string;
}

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

export async function login(options: LoginOptions): Promise<void> {
  const json = options.json ?? false;
  const log = (msg: string) => !json && console.log(msg);

  log("Extracting Marktguru API key (HTTP-only)...\n");

  try {
    const apiKey = await extractApiKey({ log: json ? undefined : log });
    await saveConfig({ apiKey });
    output({ success: true, apiKey }, json);
  } catch (e) {
    output({ success: false, error: (e as Error).message }, json);
    process.exit(1);
  }
}
