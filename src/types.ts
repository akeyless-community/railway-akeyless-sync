export interface SyncConfig {
  akeylessAccessId?: string;
  akeylessAccessKey?: string;
  akeylessToken?: string;
  akeylessApiUrl: string;
  akeylessSecretPath: string;
  railwayApiToken: string;
  railwayProjectId: string;
  railwayEnvironmentId: string;
  railwayServiceId?: string;
  secretNamePrefix?: string;
  skipRailwayPrefix: boolean;
  skipReferenceVariables: boolean;
  deleteOrphaned: boolean;
  skipDeploys: boolean;
  replaceAll: boolean;
  dryRun: boolean;
}

export interface AkeylessItem {
  item_name: string;
  item_type: string;
}

export interface AkeylessListResponse {
  items: AkeylessItem[] | null;
  folders: string[] | null;
}

export interface SyncResult {
  created: string[];
  updated: string[];
  skipped: string[];
  deleted: string[];
  errors: Array<{ name: string; error: string }>;
}
