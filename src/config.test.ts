import assert from "node:assert/strict";
import test from "node:test";
import { isProtectedRailwayVariable, toEnvName } from "./config.js";

test("toEnvName strips folder path and uppercases", () => {
  assert.equal(toEnvName("/railway/demo/production/database-url"), "DATABASE_URL");
});

test("toEnvName strips configured prefix", () => {
  assert.equal(toEnvName("/railway/demo/STRIPE_KEY", "STRIPE_"), "KEY");
});

test("isProtectedRailwayVariable blocks RAILWAY_ names", () => {
  assert.equal(
    isProtectedRailwayVariable("RAILWAY_PUBLIC_DOMAIN", "example.com", {
      skipRailwayPrefix: true,
      skipReferenceVariables: true,
    }),
    "RAILWAY_ prefix is reserved by Railway",
  );
});

test("isProtectedRailwayVariable blocks reference syntax", () => {
  assert.equal(
    isProtectedRailwayVariable("DATABASE_URL", "${{ Postgres.DATABASE_URL }}", {
      skipRailwayPrefix: true,
      skipReferenceVariables: true,
    }),
    "reference variables are managed by Railway",
  );
});
