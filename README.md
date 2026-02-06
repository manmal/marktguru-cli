# marktguru-cli 🧘‍♂️
[![CI](https://github.com/manmal/marktguru-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/manmal/marktguru-cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/marktguru-cli.svg)](https://www.npmjs.com/package/marktguru-cli)
[![license](https://img.shields.io/github/license/manmal/marktguru-cli.svg)](https://github.com/manmal/marktguru-cli/blob/main/LICENSE)

CLI for Austrian Marktguru supermarket deals.

## Quick Start (Recommended)
Use `npx` to run without installing anything:
```bash
npx --yes marktguru-cli login
npx --yes marktguru-cli search raw "milch OR soja"
npx --yes marktguru-cli search build --term milch --or soja
```

## Requirements
- Node.js 18+ (built-in `fetch`)
- Works with `npm`, `pnpm`, and `bun`

## Commands
Login (extracts API key via HTTP by scanning the site’s JS):
```bash
marktguru login
```

Search (raw query string syntax):
```bash
marktguru search raw "kellys OR \"erdnuss snips\""
```

Search (structured builder):
```bash
marktguru search build --term kellys --phrase "erdnuss snips" --or manner --explain
```

Show supported query syntax:
```bash
marktguru search syntax
```

Set a default ZIP code:
```bash
marktguru set-zip 1010
```

Show config:
```bash
marktguru config
```

## Also Working (Install Locally)
Install and run from source:
```bash
pnpm install
pnpm run build
pnpm run start -- --help
```

Dev mode (TS directly):
```bash
pnpm run dev -- --help
```

## Search Options
Available for both `search raw` and `search build`:
- `-z, --zip <code>`: ZIP code for location-based results
- `-n, --limit <number>`: Number of results (default: 10)
- `-r, --retailer <name>`: Filter by retailer (client-side)
- `-j, --json`: JSON output

If no API key is configured, `search` will automatically run `login` to extract one.

Builder-only:
- `--term <value>`: Add a term (repeatable)
- `--phrase <value>`: Add an exact phrase (repeatable)
- `--wildcard <value>`: Add a wildcard term like `kell*` (repeatable)
- `--or <value>`: Add a term to an OR group (repeatable)
- `--group <value>`: Add a raw group wrapped in parentheses (repeatable)
- `--explain`: Print the built query to stderr

## Query Syntax (Observed)
The API appears to accept a Lucene/Elasticsearch-style query string, not SQL.

Supported:
- `OR` for boolean OR
- `*` wildcard (e.g., `kell*`)
- `"..."` exact phrase
- `( ... )` grouping

Not supported (observed):
- `AND`, `NOT`, `~`, `^`

## Notes on `login`
- Uses HTTP requests (no browser automation).
- Scans entry HTML and boot scripts for embedded API keys and validates them.
- May break if the website changes.

## Config Location
- `~/.marktguru/config.json`
