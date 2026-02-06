import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatResultsText, simplifyOffer } from "../dist/commands/search.js";

async function loadFixture() {
  const raw = await readFile(new URL("./fixtures/search-result.json", import.meta.url));
  return JSON.parse(raw.toString());
}

test("formatResultsText includes externalUrl when available", async () => {
  const fixture = await loadFixture();
  const output = formatResultsText(fixture, "chips");
  assert.match(output, /https:\/\/shop\.billa\.at/);
});

test("simplifyOffer exposes externalUrl only when present", async () => {
  const fixture = await loadFixture();
  const offer = fixture.results[0];
  const simplified = simplifyOffer(offer);

  assert.equal(simplified.externalUrl, offer.externalUrl);
});
