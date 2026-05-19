import { apiFetch } from "./client";
import type {
  OrchestratorProject,
  OrchestratorProjectPayload,
  OrchestratorWorkflowDetail,
  OrchestratorWorkflowPayload,
  OrchestratorWorkflowSummary
} from "./types";

export function listProjects(): Promise<OrchestratorProject[]> {
  return apiFetch<OrchestratorProject[]>("/api/v1/orchestrator/projects");
}

export function createProject(payload: OrchestratorProjectPayload): Promise<OrchestratorProject> {
  return apiFetch<OrchestratorProject>("/api/v1/orchestrator/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProject(
  id: string,
  payload: OrchestratorProjectPayload
): Promise<OrchestratorProject> {
  return apiFetch<OrchestratorProject>(`/api/v1/orchestrator/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/orchestrator/projects/${id}`, { method: "DELETE" });
}

export function listWorkflows(): Promise<OrchestratorWorkflowSummary[]> {
  return apiFetch<OrchestratorWorkflowSummary[]>("/api/v1/orchestrator/workflows");
}

export function createWorkflow(
  payload: OrchestratorWorkflowPayload
): Promise<OrchestratorWorkflowDetail> {
  return apiFetch<OrchestratorWorkflowDetail>("/api/v1/orchestrator/workflows", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getWorkflow(id: string): Promise<OrchestratorWorkflowDetail> {
  return apiFetch<OrchestratorWorkflowDetail>(`/api/v1/orchestrator/workflows/${id}`);
}

function approval(
  id: string,
  action: string,
  comment: string | null
): Promise<OrchestratorWorkflowDetail> {
  return apiFetch<OrchestratorWorkflowDetail>(`/api/v1/orchestrator/workflows/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify({ comment })
  });
}

export function approveSpec(
  id: string,
  comment: string | null
): Promise<OrchestratorWorkflowDetail> {
  return approval(id, "approve-spec", comment);
}

export function requestSpecChanges(
  id: string,
  comment: string | null
): Promise<OrchestratorWorkflowDetail> {
  return approval(id, "request-spec-changes", comment);
}

export function approveArchitecture(
  id: string,
  comment: string | null
): Promise<OrchestratorWorkflowDetail> {
  return approval(id, "approve-architecture", comment);
}

export function requestArchitectureChanges(
  id: string,
  comment: string | null
): Promise<OrchestratorWorkflowDetail> {
  return approval(id, "request-architecture-changes", comment);
}

export function reject(id: string, comment: string | null): Promise<OrchestratorWorkflowDetail> {
  return approval(id, "reject", comment);
}
