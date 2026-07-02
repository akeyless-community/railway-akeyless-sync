import type { SyncConfig } from "./types.js";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function requireEnv(name: string): string {
  const value = env(name);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        "Set it in your shell or create a .env file (see .env.example).",
    );
  }
  return value;
}

function parseBoolean(name: string, defaultValue: boolean): boolean {
  const value = env(name);
  if (value === undefined) {
    return defaultValue;
  }
  return value === "true" || value === "1" || value === "yes";
}

function validateRailwayToken(token: string): void {
  const trimmed = token.trim();
  if (trimmed.length < 20) {
    throw new Error(
      "RAILWAY_API_TOKEN looks too short. Use an account or workspace token from " +
        "https://railway.com/account/tokens (project-scoped tokens are not supported for sync).",
    );
  }
}

export function toEnvName(itemPath: string, prefix?: string): string {
  const base = itemPath.split("/").pop() ?? itemPath;
  let name = base.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase();

  if (prefix && name.startsWith(prefix)) {
    name = name.slice(prefix.length);
  }

  return name;
}

export function isProtectedRailwayVariable(
  name: string,
  value: string,
  options: { skipRailwayPrefix: boolean; skipReferenceVariables: boolean },
): string | undefined {
  if (options.skipRailwayPrefix && name.startsWith("RAILWAY_")) {
    return "RAILWAY_ prefix is reserved by Railway";
  }

  if (options.skipReferenceVariables && value.includes("${{")) {
    return "reference variables are managed by Railway";
  }

  return undefined;
}

export function loadConfig(overrides: Partial<SyncConfig> = {}): SyncConfig {
  const railwayApiToken = requireEnv("RAILWAY_API_TOKEN").trim();
  validateRailwayToken(railwayApiToken);

  const config: SyncConfig = {
    akeylessAccessId: env("AKEYLESS_ACCESS_ID"),
    akeylessAccessKey: env("AKEYLESS_ACCESS_KEY"),
    akeylessToken: env("AKEYLESS_TOKEN"),
    akeylessApiUrl: env("AKEYLESS_API_URL") ?? "https://api.akeyless.io",
    akeylessSecretPath: env("AKEYLESS_SECRET_PATH") ?? "/",
    railwayApiToken,
    railwayProjectId: requireEnv("RAILWAY_PROJECT_ID").trim(),
    railwayEnvironmentId: requireEnv("RAILWAY_ENVIRONMENT_ID").trim(),
    railwayServiceId: env("RAILWAY_SERVICE_ID")?.trim(),
    secretNamePrefix: env("SECRET_NAME_PREFIX"),
    skipRailwayPrefix: parseBoolean("SKIP_RAILWAY_PREFIX", true),
    skipReferenceVariables: parseBoolean("SKIP_REFERENCE_VARIABLES", true),
    deleteOrphaned: parseBoolean("DELETE_ORPHANED", false),
    skipDeploys: parseBoolean("SKIP_DEPLOYS", false),
    replaceAll: parseBoolean("REPLACE_ALL", false),
    dryRun: false,
    ...overrides,
  };

  if (!config.akeylessToken && (!config.akeylessAccessId || !config.akeylessAccessKey)) {
    throw new Error(
      "Provide AKEYLESS_TOKEN or both AKEYLESS_ACCESS_ID and AKEYLESS_ACCESS_KEY " +
        "(in your shell or .env file).",
    );
  }

  return config;
}
