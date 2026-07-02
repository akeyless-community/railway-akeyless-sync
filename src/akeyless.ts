import type { AkeylessListResponse } from "./types.js";

export class AkeylessClient {
  private token?: string;

  constructor(
    private readonly apiUrl: string,
    private readonly accessId?: string,
    private readonly accessKey?: string,
    initialToken?: string,
  ) {
    this.token = initialToken;
  }

  async authenticate(): Promise<string> {
    if (this.token) return this.token;
    if (!this.accessId || !this.accessKey) {
      throw new Error("Akeyless credentials are required");
    }

    const response = await this.post<{ token: string }>("/auth", {
      "access-id": this.accessId,
      "access-key": this.accessKey,
    });

    this.token = response.token;
    return this.token;
  }

  async listStaticSecrets(path: string): Promise<string[]> {
    await this.authenticate();
    const names: string[] = [];
    await this.walk(path, names);
    return names.filter((name) => !name.endsWith("/"));
  }

  async getSecretValues(names: string[]): Promise<Record<string, string>> {
    if (names.length === 0) return {};
    await this.authenticate();

    const response = await this.post<Record<string, string>>("/get-secret-value", {
      names,
      json: true,
    });

    return response;
  }

  private async walk(path: string, names: string[]): Promise<void> {
    const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
    const response = await this.post<AkeylessListResponse>("/list-items", {
      path: normalized || "/",
      type: ["static-secret"],
      "auto-pagination": "enabled",
    });

    for (const item of response.items ?? []) {
      if (item.item_type === "STATIC_SECRET") {
        names.push(item.item_name);
      }
    }

    for (const folder of response.folders ?? []) {
      await this.walk(folder, names);
    }
  }

  private async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, token: this.token }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Akeyless ${endpoint} failed (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  }
}
