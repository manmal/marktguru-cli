import { getConfig, DEFAULT_ZIP_CODE, DEFAULT_COUNTRY, VALID_COUNTRIES } from "./config.js";

export function getApiBase(country: string): string {
  if (!(VALID_COUNTRIES as readonly string[]).includes(country)) {
    throw new Error(`Unsupported country "${country}". Valid options: ${VALID_COUNTRIES.join(", ")}`);
  }
  return `https://api.marktguru.${country}/api/v1`;
}

export interface Offer {
  id: number;
  price: number;
  oldPrice: number | null;
  description: string;
  externalUrl?: string | null;
  product: {
    id: number;
    name: string;
  };
  brand: {
    name: string;
  } | null;
  advertisers: Array<{
    name: string;
  }>;
  validityDates: Array<{
    from: string;
    to: string;
  }>;
  referencePrice: number;
  unit: {
    shortName: string;
  } | null;
  volume: number | null;
  quantity: number | null;
}

export interface SearchResult {
  totalResults: number;
  results: Offer[];
  filters: {
    retailers: Array<{ id: number; name: string; resultsCount: number }>;
    brands: Array<{ id: number; name: string; resultsCount: number }>;
    categories: Array<{ id: number; name: string; resultsCount: number }>;
  };
}

export interface SearchOptions {
  query: string;
  zipCode?: string;
  country?: string;
  limit?: number;
  offset?: number;
  retailerId?: number;
  apiKey?: string;
}

export async function search(options: SearchOptions): Promise<SearchResult> {
  const config = await getConfig();
  const apiKey = options.apiKey ?? config.apiKey;
  if (!apiKey) {
    throw new Error("No API key configured. Run 'marktguru login' first.");
  }

  const zipCode = options.zipCode || config.zipCode || DEFAULT_ZIP_CODE;
  const country = options.country || config.country || DEFAULT_COUNTRY;

  const params = new URLSearchParams({
    as: "web",
    q: options.query,
    limit: String(options.limit || 20),
    offset: String(options.offset || 0),
    zipCode,
  });

  if (options.retailerId) {
    params.set("retailerIds", String(options.retailerId));
  }

  const url = `${getApiBase(country)}/offers/search?${params}`;

  const response = await fetch(url, {
    headers: {
      "x-apikey": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("API key invalid or expired. Run 'marktguru login' to refresh.");
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function formatPrice(price: number): string {
  return `€${price.toFixed(2)}`;
}

export function formatDiscount(price: number, oldPrice: number | null): string {
  if (!oldPrice || oldPrice <= price) return "";
  const percent = Math.round((1 - price / oldPrice) * 100);
  return `-${percent}%`;
}

export function formatValidity(dates: Offer["validityDates"]): string {
  if (!dates.length) return "";
  const to = new Date(dates[0].to);
  const now = new Date();
  const daysLeft = Math.ceil((to.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft === 0) return "today";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}
