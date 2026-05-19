import type { TodoTaskPayload } from "../../../app/api/types";

export function emptyTaskPayload(
  overrides: Pick<TodoTaskPayload, "title"> & Partial<TodoTaskPayload>
): TodoTaskPayload {
  return {
    project_id: null,
    parent_task_id: null,
    notes: null,
    url: null,
    due_date: null,
    due_time: null,
    repeat_frequency: "none",
    repeat_interval: 1,
    repeat_until: null,
    flagged: false,
    priority: "none",
    ...overrides
  };
}
