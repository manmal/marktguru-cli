#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import { login } from "./commands/login.js";
import { searchBuildCommand, searchRawCommand } from "./commands/search.js";
import { getConfig, saveConfig, DEFAULT_ZIP_CODE, DEFAULT_COUNTRY, VALID_COUNTRIES } from "./config.js";
import { QUERY_SYNTAX_HELP } from "./query.js";

const program = new Command();

program
  .name("marktguru")
  .description("CLI for Marktguru supermarket deals (AT/DE)")
  .version("0.1.0")
  .option("-j, --json", "Output JSON (for all commands)");

program.addHelpText(
  "afterAll",
  [
    "",
    "Examples:",
    "  $ marktguru login",
    "  $ marktguru search raw \"kellys OR \\\"erdnuss snips\\\"\"",
    "  $ marktguru search build --term kellys --phrase \"erdnuss snips\" --or manner --explain",
    "  $ marktguru search syntax",
    "",
  ].join("\n")
);

const getJsonFlag = (options?: { json?: boolean }) =>
  Boolean(options?.json ?? program.opts().json);

const parsePositiveInt = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new InvalidArgumentError("Value must be a positive integer.");
  }
  return parsed;
};

const collectValues = (value: string, previous: string[]): string[] => {
  previous.push(value);
  return previous;
};

program
  .command("login")
  .description("Extract API key from marktguru.at/de via HTTP")
  .option("-j, --json", "Output JSON")
  .action(async (options) => {
    await login({ ...options, json: getJsonFlag(options) });
  });

const search = program
  .command("search")
  .description("Search for product deals using the Marktguru query syntax");

search
  .command("raw <query>")
  .description("Search using a raw query string")
  .option("-z, --zip <code>", "ZIP code for location-based results")
  .option("-n, --limit <number>", "Number of results (default: 10)", parsePositiveInt)
  .option("-r, --retailer <name>", "Filter by retailer (e.g., SPAR, BILLA, HOFER)")
  .option("-j, --json", "Output JSON")
  .action((query, options) => {
    searchRawCommand(query, { ...options, json: getJsonFlag(options) });
  });

search
  .command("build")
  .description("Build a query from structured flags")
  .option("--term <value>", "Add a term", collectValues, [])
  .option("--phrase <value>", "Add an exact phrase", collectValues, [])
  .option("--wildcard <value>", "Add a wildcard term (e.g., kell*)", collectValues, [])
  .option("--or <value>", "Add a term to the OR group", collectValues, [])
  .option("--group <value>", "Add a raw group (wrapped in parentheses)", collectValues, [])
  .option("--explain", "Print the built query to stderr")
  .option("-z, --zip <code>", "ZIP code for location-based results")
  .option("-n, --limit <number>", "Number of results (default: 10)", parsePositiveInt)
  .option("-r, --retailer <name>", "Filter by retailer (e.g., SPAR, BILLA, HOFER)")
  .option("-j, --json", "Output JSON")
  .action((options) => {
    searchBuildCommand({ ...options, json: getJsonFlag(options) });
  });

search
  .command("syntax")
  .description("Show supported query syntax")
  .action(() => {
    console.log(QUERY_SYNTAX_HELP);
  });

search.action(() => {
  search.outputHelp();
});

program
  .command("set-zip <code>")
  .description("Set default ZIP code for searches")
  .option("-j, --json", "Output JSON")
  .action(async (code: string, options) => {
    await saveConfig({ zipCode: code });
    const json = getJsonFlag(options);
    if (json) {
      console.log(JSON.stringify({ success: true, zipCode: code }));
    } else {
      console.log(`✓ Default ZIP code set to: ${code}`);
    }
  });

program
  .command("set-country <code>")
  .description("Set default country for searches (at, de)")
  .option("-j, --json", "Output JSON")
  .action(async (code: string, options) => {
    const normalized = code.toLowerCase();
    if (!(VALID_COUNTRIES as readonly string[]).includes(normalized)) {
      console.error(`Error: Invalid country "${code}". Valid options: ${VALID_COUNTRIES.join(", ")}`);
      process.exit(1);
    }
    const existing = await getConfig();
    const countryChanged = existing.country !== normalized;
    await saveConfig({ country: normalized, ...(countryChanged && { apiKey: undefined }) });
    const json = getJsonFlag(options);
    if (json) {
      console.log(JSON.stringify({ success: true, country: normalized, apiKeyCleared: countryChanged && !!existing.apiKey }));
    } else {
      console.log(`✓ Default country set to: ${normalized}`);
      if (countryChanged && existing.apiKey) {
        console.log("  API key cleared — run 'marktguru login' to fetch a matching key.");
      }
    }
  });

program
  .command("config")
  .description("Show current configuration")
  .option("-j, --json", "Output JSON")
  .action(async (options) => {
    const config = await getConfig();
    const json = getJsonFlag(options);
    if (json) {
      console.log(JSON.stringify({
        apiKey: config.apiKey ? config.apiKey.substring(0, 10) + "..." : null,
        apiKeySet: !!config.apiKey,
        zipCode: config.zipCode || DEFAULT_ZIP_CODE,
        country: config.country || DEFAULT_COUNTRY,
        configPath: config.configPath,
      }));
    } else {
      console.log("Configuration:");
      console.log("  API Key:", config.apiKey ? config.apiKey.substring(0, 10) + "..." : "(not set)");
      console.log("  ZIP Code:", config.zipCode || `(default: ${DEFAULT_ZIP_CODE})`);
      console.log("  Country:", config.country || `(default: ${DEFAULT_COUNTRY})`);
      console.log("  Config file:", config.configPath);
    }
  });

if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse();
