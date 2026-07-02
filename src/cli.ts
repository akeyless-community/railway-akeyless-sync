#!/usr/bin/env node
import { config as loadEnvFile } from "dotenv";

loadEnvFile();

import { loadConfig } from "./config.js";
import { runSyncFromEnv } from "./index.js";
import type { SyncResult } from "./types.js";

function printResult(result: SyncResult): void {
  console.log("\nAkeyless to Railway sync complete\n");
  console.log(`  Created: ${result.created.length}`);
  console.log(`  Updated: ${result.updated.length}`);
  console.log(`  Skipped: ${result.skipped.length}`);
  console.log(`  Deleted: ${result.deleted.length}`);
  console.log(`  Errors:  ${result.errors.length}`);

  if (result.created.length) {
    console.log("\nCreated:");
    for (const name of result.created) console.log(`  + ${name}`);
  }

  if (result.updated.length) {
    console.log("\nUpdated:");
    for (const name of result.updated) console.log(`  ~ ${name}`);
  }

  if (result.skipped.length) {
    console.log("\nSkipped:");
    for (const name of result.skipped) console.log(`  - ${name}`);
  }

  if (result.deleted.length) {
    console.log("\nDeleted:");
    for (const name of result.deleted) console.log(`  x ${name}`);
  }

  if (result.errors.length) {
    console.log("\nErrors:");
    for (const error of result.errors) {
      console.log(`  ! ${error.name}: ${error.error}`);
    }
  }
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help") {
    console.log(`Akeyless Railway Sync

Usage:
  akeyless-railway-sync sync [--dry-run]
  akeyless-railway-sync validate

Environment variables (shell or .env file):
  AKEYLESS_ACCESS_ID, AKEYLESS_ACCESS_KEY  (or AKEYLESS_TOKEN)
  AKEYLESS_SECRET_PATH                     (default: /)
  RAILWAY_API_TOKEN                        (account or workspace token)
  RAILWAY_PROJECT_ID
  RAILWAY_ENVIRONMENT_ID
  RAILWAY_SERVICE_ID                       (optional — omit for shared variables)
  DELETE_ORPHANED                          (default: false)
  SKIP_DEPLOYS                             (default: false)
  REPLACE_ALL                              (default: false — dangerous)
`);
    return;
  }

  if (command === "validate") {
    loadConfig();
    console.log("Configuration is valid.");
    return;
  }

  if (command === "sync") {
    const dryRun = args.includes("--dry-run");
    const result = await runSyncFromEnv({ dryRun });
    printResult(result);

    if (result.errors.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}

main().catch((error: Error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
