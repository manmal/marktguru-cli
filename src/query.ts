export interface QueryBuildInput {
  terms?: string[];
  phrases?: string[];
  wildcards?: string[];
  ors?: string[];
  groups?: string[];
}

export interface QueryBuildResult {
  query: string;
  warnings: string[];
}

export const QUERY_SYNTAX_HELP = [
  "Query syntax (observed):",
  "- OR : boolean OR",
  "- * : wildcard, e.g. kell*",
  "- \"...\" : exact phrase",
  "- ( ... ) : grouping",
  "- NOT supported: AND, NOT, ~, ^",
  "",
  "Build mode flags:",
  "- --term <value> : add a term",
  "- --phrase <value> : add an exact phrase",
  "- --wildcard <value> : add a wildcard term (e.g. kell*)",
  "- --or <value> : add a term to an OR group",
  "- --group <value> : add a raw group (wrapped in parentheses)",
].join("\n");

const WHITESPACE_REGEX = /\s/;
const QUOTE_ESCAPE_REGEX = /["\\]/g;

function escapeQuotes(value: string): string {
  return value.replace(QUOTE_ESCAPE_REGEX, "\\$&");
}

function quote(value: string): string {
  return `"${escapeQuotes(value)}"`;
}

function normalizeTerm(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (WHITESPACE_REGEX.test(trimmed)) {
    return quote(trimmed);
  }
  return trimmed;
}

function normalizePhrase(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return quote(trimmed);
}

function normalizeWildcard(value: string): { token: string | null; warning?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { token: null };
  if (WHITESPACE_REGEX.test(trimmed)) {
    return {
      token: quote(trimmed),
      warning: "Wildcard contained whitespace and was quoted as a phrase.",
    };
  }
  return { token: trimmed };
}

function normalizeGroup(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `(${trimmed})`;
}

export function buildQuery(input: QueryBuildInput): QueryBuildResult {
  const parts: string[] = [];
  const warnings: string[] = [];

  for (const term of input.terms ?? []) {
    const token = normalizeTerm(term);
    if (token) parts.push(token);
  }

  for (const phrase of input.phrases ?? []) {
    const token = normalizePhrase(phrase);
    if (token) parts.push(token);
  }

  for (const wildcard of input.wildcards ?? []) {
    const { token, warning } = normalizeWildcard(wildcard);
    if (warning) warnings.push(warning);
    if (token) parts.push(token);
  }

  const orTerms: string[] = [];
  for (const orTerm of input.ors ?? []) {
    const token = normalizeTerm(orTerm);
    if (token) orTerms.push(token);
  }
  if (orTerms.length > 0) {
    parts.push(`(${orTerms.join(" OR ")})`);
  }

  for (const group of input.groups ?? []) {
    const token = normalizeGroup(group);
    if (token) parts.push(token);
  }

  const query = parts.join(" ").trim();
  if (!query) {
    throw new Error(
      "No query parts provided. Use --term, --phrase, --wildcard, --or, or --group."
    );
  }

  return { query, warnings };
}
