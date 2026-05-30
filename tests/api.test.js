import test from "node:test";
import assert from "node:assert/strict";
import { getApiBase } from "../dist/api.js";

test("getApiBase returns correct URL for AT", () => {
  assert.equal(getApiBase("at"), "https://api.marktguru.at/api/v1");
});

test("getApiBase returns correct URL for DE", () => {
  assert.equal(getApiBase("de"), "https://api.marktguru.de/api/v1");
});

test("getApiBase throws on unsupported country", () => {
  assert.throws(() => getApiBase("fr"), /Unsupported country/);
});
