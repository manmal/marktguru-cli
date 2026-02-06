import {
  search as apiSearch,
  formatPrice,
  formatDiscount,
  formatValidity,
  type Offer,
  type SearchResult,
} from "../api.js";
import { getConfig, saveConfig } from "../config.js";
import { extractApiKey } from "../auth.js";
import { buildQuery } from "../query.js";

export interface SimpleOffer {
  title: string;
  price: number;
  retailer: string;
  expires: string;
  discountPercent: number | null;
  externalUrl?: string;
}

export function simplifyOffer(offer: Offer): SimpleOffer {
  // Build full title: "Brand Product Description"
  const parts = [
    offer.brand?.name,
    offer.product.name,
    offer.description,
  ].filter(Boolean);
  const title = parts.join(" - ");

  // Calculate discount
  let discountPercent: number | null = null;
  if (offer.oldPrice && offer.oldPrice > offer.price) {
    discountPercent = Math.round((1 - offer.price / offer.oldPrice) * 100);
  }

  // Get expiry date
  const expires = offer.validityDates[0]?.to 
    ? new Date(offer.validityDates[0].to).toISOString().split("T")[0]
    : "";

  return {
    title,
    price: offer.price,
    retailer: offer.advertisers[0]?.name || "Unknown",
    expires,
    discountPercent,
    externalUrl: offer.externalUrl ?? undefined,
  };
}

interface SimpleSearchResult {
  query: string;
  total: number;
  offers: SimpleOffer[];
}

export interface SearchCommandOptions {
  zip?: string;
  limit?: number;
  retailer?: string;
  json?: boolean;
  explain?: boolean;
}

export interface SearchBuildOptions extends SearchCommandOptions {
  term?: string[];
  phrase?: string[];
  wildcard?: string[];
  or?: string[];
  group?: string[];
}

const DEFAULT_LIMIT = 10;

export function formatOfferText(offer: Offer): string {
  const lines: string[] = [];

  // Product name and brand
  const brand = offer.brand?.name ? `[${offer.brand.name}]` : "";
  lines.push(`${offer.product.name} ${brand}`.trim());

  // Price line
  const discount = formatDiscount(offer.price, offer.oldPrice);
  const priceInfo = discount
    ? `${formatPrice(offer.price)} (was ${formatPrice(offer.oldPrice!)}) ${discount}`
    : formatPrice(offer.price);

  // Unit price if available
  const unitInfo =
    offer.volume && offer.unit
      ? ` · ${formatPrice(offer.referencePrice)}/${offer.unit.shortName}`
      : "";

  lines.push(`  💰 ${priceInfo}${unitInfo}`);

  // Description
  if (offer.description) {
    lines.push(`  📦 ${offer.description}`);
  }

  // Retailer and validity
  const retailer = offer.advertisers[0]?.name || "Unknown";
  const validity = formatValidity(offer.validityDates);
  lines.push(`  🏪 ${retailer} · ${validity}`);

  if (offer.externalUrl) {
    lines.push(`  🔗 ${offer.externalUrl}`);
  }

  return lines.join("\n");
}

export function formatResultsText(result: SearchResult, query: string): string {
  const lines: string[] = [];

  lines.push(`Found ${result.totalResults} offers for "${query}":\n`);

  if (result.results.length === 0) {
    lines.push("No offers found.");
    return lines.join("\n");
  }

  for (const offer of result.results) {
    lines.push(formatOfferText(offer));
    lines.push(""); // Empty line between offers
  }

  // Show available filters summary
  if (result.filters.retailers.length > 0) {
    const topRetailers = result.filters.retailers
      .slice(0, 5)
      .map((r) => `${r.name} (${r.resultsCount})`)
      .join(", ");
    lines.push(`📍 Retailers: ${topRetailers}`);
  }

  return lines.join("\n");
}

function normalizeLimit(limit?: number): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("Limit must be a positive number.");
  }
  return Math.floor(limit);
}

function emitWarnings(warnings: string[]): void {
  if (warnings.length === 0) return;
  for (const warning of warnings) {
    console.error(`Warning: ${warning}`);
  }
}

async function ensureApiKey(json?: boolean): Promise<string | undefined> {
  const config = await getConfig();
  if (config.apiKey) return config.apiKey;

  const log = json ? (msg: string) => console.error(msg) : (msg: string) => console.log(msg);
  log("No API key configured. Running login...");

  const apiKey = await extractApiKey({ log });
  await saveConfig({ apiKey });
  return apiKey;
}

async function runSearch(query: string, options: SearchCommandOptions): Promise<void> {
  const apiKey = await ensureApiKey(options.json);
  // Fetch more results if filtering by retailer (we'll filter client-side)
  const limit = normalizeLimit(options.limit);
  const fetchLimit = options.retailer ? Math.max(limit, 100) : limit;

  const result = await apiSearch({
    query,
    zipCode: options.zip,
    limit: fetchLimit,
    apiKey,
  });

  let filteredResults = result.results;
  let totalResults = result.totalResults;

  if (options.retailer) {
    const retailerLower = options.retailer.toLowerCase();
    filteredResults = filteredResults.filter((offer) =>
      offer.advertisers.some((a) =>
        a.name.toLowerCase().includes(retailerLower)
      )
    );
    filteredResults = filteredResults.slice(0, limit);
    totalResults = filteredResults.length;
  } else {
    filteredResults = filteredResults.slice(0, limit);
  }

  if (options.json) {
    const simple: SimpleSearchResult = {
      query,
      total: totalResults,
      offers: filteredResults.map(simplifyOffer),
    };
    console.log(JSON.stringify(simple, null, 2));
  } else {
    console.log(formatResultsText({ ...result, results: filteredResults, totalResults }, query));
  }
}

export async function searchRawCommand(
  query: string,
  options: SearchCommandOptions
): Promise<void> {
  try {
    await runSearch(query, options);
  } catch (e) {
    console.error("Error:", (e as Error).message);
    process.exit(1);
  }
}

export async function searchBuildCommand(
  options: SearchBuildOptions
): Promise<void> {
  try {
    const { query, warnings } = buildQuery({
      terms: options.term,
      phrases: options.phrase,
      wildcards: options.wildcard,
      ors: options.or,
      groups: options.group,
    });

    if (options.explain) {
      console.error(`Query: ${query}`);
    }
    emitWarnings(warnings);

    await runSearch(query, options);
  } catch (e) {
    console.error("Error:", (e as Error).message);
    process.exit(1);
  }
}
