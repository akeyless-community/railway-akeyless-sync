import { AkeylessClient } from "./akeyless.js";
import { isProtectedRailwayVariable, loadConfig, toEnvName } from "./config.js";
import { RailwayVariablesClient } from "./railway.js";
import type { SyncConfig, SyncResult } from "./types.js";

export async function syncSecrets(config: SyncConfig): Promise<SyncResult> {
  const result: SyncResult = {
    created: [],
    updated: [],
    skipped: [],
    deleted: [],
    errors: [],
  };

  const akeyless = new AkeylessClient(
    config.akeylessApiUrl,
    config.akeylessAccessId,
    config.akeylessAccessKey,
    config.akeylessToken,
  );

  const railway = new RailwayVariablesClient(config.railwayApiToken);
  const target = {
    projectId: config.railwayProjectId,
    environmentId: config.railwayEnvironmentId,
    serviceId: config.railwayServiceId,
  };

  const itemNames = await akeyless.listStaticSecrets(config.akeylessSecretPath);
  const values = await akeyless.getSecretValues(itemNames);
  const existing = await railway.listVariables(target);
  const existingNames = new Set(Object.keys(existing));

  const desired = new Map<string, string>();

  for (const itemName of itemNames) {
    const envName = toEnvName(itemName, config.secretNamePrefix);
    const value = values[itemName];

    if (value === undefined) {
      result.errors.push({ name: itemName, error: "Secret value not returned by Akeyless" });
      continue;
    }

    const skipReason = isProtectedRailwayVariable(envName, value, {
      skipRailwayPrefix: config.skipRailwayPrefix,
      skipReferenceVariables: config.skipReferenceVariables,
    });
    if (skipReason) {
      result.skipped.push(`${itemName} -> ${envName} (${skipReason})`);
      continue;
    }

    desired.set(envName, value);
  }

  const toUpsert = Object.fromEntries(desired.entries());

  if (config.dryRun) {
    for (const name of Object.keys(toUpsert)) {
      if (existingNames.has(name)) {
        result.updated.push(name);
      } else {
        result.created.push(name);
      }
    }

    if (config.deleteOrphaned) {
      for (const name of Object.keys(existing)) {
        if (!desired.has(name)) {
          const skipReason = isProtectedRailwayVariable(name, existing[name] ?? "", {
            skipRailwayPrefix: config.skipRailwayPrefix,
            skipReferenceVariables: config.skipReferenceVariables,
          });
          if (!skipReason) {
            result.deleted.push(name);
          }
        }
      }
    }

    return result;
  }

  try {
    await railway.upsertVariables(target, toUpsert, {
      skipDeploys: config.skipDeploys,
      replace: config.replaceAll,
    });

    for (const name of Object.keys(toUpsert)) {
      if (existingNames.has(name)) {
        result.updated.push(name);
      } else {
        result.created.push(name);
      }
    }
  } catch (error) {
    throw new Error(`Sync failed while upserting Railway variables: ${(error as Error).message}`);
  }

  if (config.deleteOrphaned && !config.replaceAll) {
    const managedNames = new Set(desired.keys());
    const orphaned = Object.keys(existing).filter((name) => {
      if (managedNames.has(name)) {
        return false;
      }

      const skipReason = isProtectedRailwayVariable(name, existing[name] ?? "", {
        skipRailwayPrefix: config.skipRailwayPrefix,
        skipReferenceVariables: config.skipReferenceVariables,
      });
      return !skipReason;
    });

    for (const name of orphaned) {
      try {
        await railway.deleteVariable(target, name, { skipDeploys: config.skipDeploys });
        result.deleted.push(name);
      } catch (error) {
        result.errors.push({
          name,
          error: `Failed to delete orphaned variable: ${(error as Error).message}`,
        });
      }
    }
  }

  return result;
}

export async function runSyncFromEnv(overrides: Partial<SyncConfig> = {}): Promise<SyncResult> {
  const config = loadConfig(overrides);
  return syncSecrets(config);
}

export { loadConfig, AkeylessClient, RailwayVariablesClient };
