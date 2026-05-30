---
name: marktguru-grocery-deals
description: Look up grocery deals and offers via Marktguru CLI/API. Use when user asks about supermarket discounts, product prices, current promotions, or comparing deals across Austrian or German retailers (Hofer, Billa, Spar, Lidl, Penny, Kaufland, etc.).
---

# Marktguru Grocery Deals

Query grocery deals from Marktguru in Austria and Germany. Supports raw queries, structured search building, retailer filtering, ZIP-code location targeting, and country selection (AT/DE).

## Quick Reference

| Command | Purpose |
|---------|---------|
| `search raw <query>` | Search with raw query string |
| `search build` | Build query from structured flags |
| `search syntax` | Show supported query syntax |
| `set-zip <code>` | Set default ZIP code |
| `set-country <code>` | Set default country (`at` or `de`, default: `at`) |
| `config` | Show current configuration |
| `login` | Extract API key from marktguru.at/de |

---

## Setup

### Login (HTTP scan)
```bash
npx marktguru-cli login
```
Scans site HTML and boot scripts for embedded API keys. No browser automation required.

### Set Default ZIP Code
```bash
npx marktguru-cli set-zip 1010
npx marktguru-cli set-zip 8010  # Graz
npx marktguru-cli set-zip 10115  # Berlin (DE)
```

### Set Default Country
```bash
npx marktguru-cli set-country at  # Austria (default)
npx marktguru-cli set-country de  # Germany
```
After switching country, re-run `login` — API keys are country-specific.

### Check Config
```bash
npx marktguru-cli config
npx marktguru-cli config --json
```

---

## Search Commands

### Raw Query Search

```bash
npx marktguru-cli search raw "Milch"
npx marktguru-cli search raw "Milch" --limit 5
npx marktguru-cli search raw "Bier" --retailer HOFER
npx marktguru-cli search raw "Brot" --zip 8010
npx marktguru-cli search raw "Cola" --json
```

### Common Options

| Flag | Description | Default |
|------|-------------|---------|
| `--limit <n>` / `-n` | Number of results | 10 |
| `--retailer <name>` / `-r` | Filter by retailer (e.g., SPAR, BILLA, HOFER) | all |
| `--zip <code>` / `-z` | ZIP code for location-based results | config default |
| `--json` / `-j` | Output JSON | false |

### Structured Builder

Build queries from flags instead of raw strings:

```bash
npx marktguru-cli search build --term butter --explain
npx marktguru-cli search build --or butter --or margarine --explain
npx marktguru-cli search build --phrase "frische milch" --limit 5
npx marktguru-cli search build --wildcard "jogh*" --retailer SPAR
```

| Flag | Description |
|------|-------------|
| `--term <value>` | Add a search term |
| `--phrase <value>` | Add exact phrase (quoted) |
| `--wildcard <value>` | Add wildcard term (e.g., `kell*`) |
| `--or <value>` | Add term to OR group (repeat for multiple) |
| `--group <value>` | Add raw parenthesized group |
| `--explain` | Print the built query to stderr |

---

## Query Syntax

**Supported:**
- `OR` — boolean OR: `Milch OR Sahne`
- `*` — wildcard: `Jogh*` (matches Joghurt, Joghurtdrink, etc.)
- `"..."` — exact phrase: `"frische Milch"`
- `()` — grouping: `(Milch OR Sahne) Bio`

**NOT supported:** `AND`, `NOT`, `~`, `^`

### Examples

```bash
# Simple term
npx marktguru-cli search raw "Butter"

# OR logic
npx marktguru-cli search raw "Käse OR Schinken"

# Wildcard
npx marktguru-cli search raw "Bio*"

# Combined with retailer filter
npx marktguru-cli search raw "Bier" --retailer HOFER --limit 10

# Exact phrase
npx marktguru-cli search raw '"Coca Cola"'
```

---

## Known Retailers

**Austria (at):**

| Retailer | Notes |
|----------|-------|
| SPAR | |
| INTERSPAR | Larger SPAR format |
| SPAR-Gourmet | Premium SPAR |
| BILLA | |
| BILLA PLUS | Larger BILLA format |
| HOFER | Austrian Aldi |
| Lidl | |
| PENNY | |
| dm drogerie markt | Drugstore (some food items) |
| BIPA | Drugstore |

**Germany (de):**

| Retailer | Notes |
|----------|-------|
| Lidl | |
| PENNY | |
| Kaufland | |
| REWE | |
| Netto Marken-Discount | |
| ALDI | |
| dm drogerie markt | Drugstore (some food items) |

---

## JSON Output

```bash
npx marktguru-cli search raw "Cola" --limit 3 --json
```

```json
{
  "query": "Cola",
  "total": 23,
  "offers": [
    {
      "title": "Coca-Cola - Cola - oder Fanta 1,5l",
      "price": 1.49,
      "retailer": "Sizin Foods GmbH",
      "expires": "2026-02-11",
      "discountPercent": null
    },
    {
      "title": "Coca-Cola - Cola - Zero / Fanta / Sprite Dose 330ml",
      "price": 0.6,
      "retailer": "Sizin Foods GmbH",
      "expires": "2026-02-11",
      "discountPercent": null
    },
    {
      "title": "Coca-Cola - Cola - div. Sorten 0,33 Liter",
      "price": 0.67,
      "retailer": "BILLA",
      "expires": "2026-02-11",
      "discountPercent": 50,
      "externalUrl": "https://shop.billa.at/produkte/..."
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `title` | Product name and brand |
| `price` | Current offer price (EUR) |
| `retailer` | Store name |
| `expires` | Offer expiration date (YYYY-MM-DD) |
| `discountPercent` | Discount percentage (null if not on sale) |
| `externalUrl` | Direct link to retailer (optional) |

---

## Human-Readable Output

```
Found 147 offers for "Milch":

Premium Bergbauern H-Milch [Salzburg Milch]
  💰 €0.99 (was €1.59) -38% · €0.99/l
  📦 3,5% Fett oder 0,5% Fett aus Österreich, 1 Liter
  🏪 SPAR · 20 days left

📍 Retailers: Lidl (33), SPAR (30), PENNY (17), INTERSPAR (16), BILLA PLUS (11)
```

---

## Config

Credentials and settings stored at `~/.marktguru/config.json`.

```bash
npx marktguru-cli config --json
```

```json
{
  "apiKey": "pCcm1AVCYa...",
  "apiKeySet": true,
  "zipCode": "1010",
  "country": "at",
  "configPath": "/Users/.../.marktguru/config.json"
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Login fails | Site structure may have changed. Re-run `login` or check for CLI updates. |
| No results | Try broader terms, wildcards (`*`), or alternative spellings. |
| Wrong location | Set ZIP code with `set-zip` or use `--zip` flag. |
| API key expired | Re-run `npx marktguru-cli login` to refresh. |
| Wrong country results | Run `set-country de` (or `at`), then `login` again — keys are country-specific. |

---

## Usage Tips

1. **Compare prices:** Use `--json` output to programmatically compare across retailers
2. **Find best deals:** Look for high `discountPercent` values
3. **Check availability:** Use `--zip` with local ZIP code for accurate results
4. **Wildcards for variants:** Use `Jogh*` to catch Joghurt, Joghurtdrink, etc.
5. **OR for alternatives:** `Butter OR Margarine` to compare substitutes
