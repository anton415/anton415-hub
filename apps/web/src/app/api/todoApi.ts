import { apiFetch } from "./client";
import type {
  TodoProject,
  TodoProjectPayload,
  TodoProjectQuery,
  TodoTask,
  TodoTaskPayload,
  TodoTaskQuery
} from "./types";

export function listProjects(query: TodoProjectQuery = {}): Promise<TodoProject[]> {
  const params = new URLSearchParams();
  if (query.include_archived !== undefined) {
    params.set("include_archived", String(query.include_archived));
  }
  if (query.archived !== undefined) {
    params.set("archived", String(query.archived));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return apiFetch<TodoProject[]>(`/api/v1/todo/projects${suffix}`);
}

export function createProject(payload: TodoProjectPayload): Promise<TodoProject> {
  return apiFetch<TodoProject>("/api/v1/todo/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProject(id: number, payload: TodoProjectPayload): Promise<TodoProject> {
  return apiFetch<TodoProject>(`/api/v1/todo/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function archiveProject(id: number): Promise<TodoProject> {
  return apiFetch<TodoProject>(`/api/v1/todo/projects/${id}/archive`, {
    method: "PATCH",
    body: JSON.stringify({})
  });
}

export function restoreProject(id: number): Promise<TodoProject> {
  return apiFetch<TodoProject>(`/api/v1/todo/projects/${id}/restore`, {
    method: "PATCH",
    body: JSON.stringify({})
  });
}

export async function deleteProject(id: number): Promise<void> {
  await apiFetch<void>(`/api/v1/todo/projects/${id}`, { method: "DELETE" });
}

export function listTasks(query: TodoTaskQuery): Promise<TodoTask[]> {
  const params = new URLSearchParams();
  if (query.view) {
    params.set("view", query.view);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.project_id) {
    params.set("project_id", String(query.project_id));
  }
  if (query.sort) {
    params.set("sort", query.sort);
  }
  if (query.direction) {
    params.set("direction", query.direction);
  }
  if (query.q) {
    params.set("q", query.q);
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return apiFetch<TodoTask[]>(`/api/v1/todo/tasks${suffix}`);
}

export function createTask(payload: TodoTaskPayload): Promise<TodoTask> {
  return apiFetch<TodoTask>("/api/v1/todo/tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateTask(id: number, payload: Partial<TodoTaskPayload>): Promise<TodoTask> {
  return apiFetch<TodoTask>(`/api/v1/todo/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteTask(id: number): Promise<void> {
  await apiFetch<void>(`/api/v1/todo/tasks/${id}`, { method: "DELETE" });
}
