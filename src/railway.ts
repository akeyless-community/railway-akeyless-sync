const RAILWAY_GRAPHQL_URL = "https://backboard.railway.com/graphql/v2";

interface GraphqlEnvelope<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface RailwayVariableTarget {
  projectId: string;
  environmentId: string;
  serviceId?: string;
}

export class RailwayVariablesClient {
  constructor(private readonly apiToken: string) {}

  async listVariables(target: RailwayVariableTarget): Promise<Record<string, string>> {
    const data = await this.graphql<{ variables: Record<string, string> }>(
      `query Variables($projectId: String!, $environmentId: String!, $serviceId: String) {
        variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
      }`,
      {
        projectId: target.projectId,
        environmentId: target.environmentId,
        serviceId: target.serviceId ?? null,
      },
    );

    return data.variables ?? {};
  }

  async upsertVariables(
    target: RailwayVariableTarget,
    variables: Record<string, string>,
    options: { skipDeploys?: boolean; replace?: boolean } = {},
  ): Promise<void> {
    if (Object.keys(variables).length === 0) {
      return;
    }

    await this.graphql(
      `mutation VariableCollectionUpsert($input: VariableCollectionUpsertInput!) {
        variableCollectionUpsert(input: $input)
      }`,
      {
        input: {
          projectId: target.projectId,
          environmentId: target.environmentId,
          serviceId: target.serviceId ?? null,
          variables,
          skipDeploys: options.skipDeploys ?? false,
          replace: options.replace ?? false,
        },
      },
    );
  }

  async deleteVariable(
    target: RailwayVariableTarget,
    name: string,
    options: { skipDeploys?: boolean } = {},
  ): Promise<void> {
    await this.graphql(
      `mutation VariableDelete($input: VariableDeleteInput!) {
        variableDelete(input: $input)
      }`,
      {
        input: {
          projectId: target.projectId,
          environmentId: target.environmentId,
          serviceId: target.serviceId ?? null,
          name,
          skipDeploys: options.skipDeploys ?? false,
        },
      },
    );
  }

  private async graphql<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(RAILWAY_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Railway GraphQL failed (${response.status}): ${text}`);
    }

    const payload = (await response.json()) as GraphqlEnvelope<T>;
    if (payload.errors?.length) {
      const message = payload.errors.map((error) => error.message).join("; ");
      throw new Error(`Railway GraphQL error: ${message}`);
    }

    if (!payload.data) {
      throw new Error("Railway GraphQL returned no data");
    }

    return payload.data;
  }
}
