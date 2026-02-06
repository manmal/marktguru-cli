import test from "node:test";
import assert from "node:assert/strict";
import { buildQuery } from "../dist/query.js";

test("buildQuery builds a structured query", () => {
  const { query, warnings } = buildQuery({
    terms: ["milch"],
    phrases: ["frische milch"],
    wildcards: ["bio*"],
    ors: ["soja", "hafer"],
    groups: ["(milch OR sahne)"],
  });

  assert.equal(
    query,
    "milch \"frische milch\" bio* (soja OR hafer) ((milch OR sahne))"
  );
  assert.deepEqual(warnings, []);
});

test("buildQuery warns on wildcard with whitespace", () => {
  const { query, warnings } = buildQuery({
    wildcards: ["bio milch"],
  });

  assert.equal(query, "\"bio milch\"");
  assert.equal(warnings.length, 1);
});

test("buildQuery throws on empty input", () => {
  assert.throws(() => buildQuery({}), /No query parts provided/);
});
