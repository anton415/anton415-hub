import type {
  OrchestratorProject,
  OrchestratorProjectPayload,
  OrchestratorWorkflowDetail,
  OrchestratorWorkflowPayload,
  OrchestratorWorkflowSummary
} from "./types";

type DataEnvelope<T> = {
  data: T;
};

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class OrchestratorApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OrchestratorApiError";
    this.code = code;
  }
}

export class OrchestratorApi {
  private readonly baseUrl: string;

  constructor(apiBaseUrl: string) {
    this.baseUrl = apiBaseUrl.replace(/\/$/, "");
  }

  listProjects(): Promise<OrchestratorProject[]> {
    return this.request<OrchestratorProject[]>("/api/v1/orchestrator/projects");
  }

  createProject(payload: OrchestratorProjectPayload): Promise<OrchestratorProject> {
    return this.request<OrchestratorProject>("/api/v1/orchestrator/projects", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  updateProject(id: string, payload: OrchestratorProjectPayload): Promise<OrchestratorProject> {
    return this.request<OrchestratorProject>(`/api/v1/orchestrator/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.request<void>(`/api/v1/orchestrator/projects/${id}`, { method: "DELETE" });
  }

  listWorkflows(): Promise<OrchestratorWorkflowSummary[]> {
    return this.request<OrchestratorWorkflowSummary[]>("/api/v1/orchestrator/workflows");
  }

  createWorkflow(payload: OrchestratorWorkflowPayload): Promise<OrchestratorWorkflowDetail> {
    return this.request<OrchestratorWorkflowDetail>("/api/v1/orchestrator/workflows", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  getWorkflow(id: string): Promise<OrchestratorWorkflowDetail> {
    return this.request<OrchestratorWorkflowDetail>(`/api/v1/orchestrator/workflows/${id}`);
  }

  approveSpec(id: string, comment: string | null): Promise<OrchestratorWorkflowDetail> {
    return this.approval(id, "approve-spec", comment);
  }

  requestSpecChanges(id: string, comment: string | null): Promise<OrchestratorWorkflowDetail> {
    return this.approval(id, "request-spec-changes", comment);
  }

  approveArchitecture(id: string, comment: string | null): Promise<OrchestratorWorkflowDetail> {
    return this.approval(id, "approve-architecture", comment);
  }

  requestArchitectureChanges(id: string, comment: string | null): Promise<OrchestratorWorkflowDetail> {
    return this.approval(id, "request-architecture-changes", comment);
  }

  reject(id: string, comment: string | null): Promise<OrchestratorWorkflowDetail> {
    return this.approval(id, "reject", comment);
  }

  private approval(id: string, action: string, comment: string | null): Promise<OrchestratorWorkflowDetail> {
    return this.request<OrchestratorWorkflowDetail>(`/api/v1/orchestrator/workflows/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify({ comment })
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init.headers
      }
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = (await response.json()) as DataEnvelope<T> & ErrorEnvelope;
    if (!response.ok) {
      throw new OrchestratorApiError(
        payload.error?.code ?? "request_failed",
        payload.error?.message ?? `Запрос завершился с ошибкой ${response.status}`
      );
    }

    return payload.data;
  }
}
