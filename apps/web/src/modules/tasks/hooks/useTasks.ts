import { useCallback, useState } from "react";
import { todoApi } from "../../../app/api";
import type {
  TodoTask,
  TodoTaskPayload,
  TodoTaskStatus
} from "../../../app/api/types";
import { buildTaskQuery, type Scope } from "../lib/constants";
import { describeError } from "../lib/describeError";

export type UseTasks = ReturnType<typeof useTasks>;

export function useTasks(onError: (message: string) => void) {
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(
    async (current: Scope) => {
      setLoading(true);
      try {
        const list = await todoApi.listTasks(buildTaskQuery(current));
        setTasks(list);
      } catch (err) {
        onError(describeError(err));
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  const toggleStatus = useCallback(
    async (task: TodoTask) => {
      const nextStatus: TodoTaskStatus = task.status === "done" ? "todo" : "done";
      try {
        const updated = await todoApi.updateTask(task.id, { status: nextStatus });
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      } catch (err) {
        onError(describeError(err));
      }
    },
    [onError]
  );

  const createTask = useCallback(
    async (payload: TodoTaskPayload) => {
      try {
        const created = await todoApi.createTask(payload);
        setTasks((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        onError(describeError(err));
        return null;
      }
    },
    [onError]
  );

  const updateTask = useCallback(
    async (id: number, payload: TodoTaskPayload) => {
      try {
        const updated = await todoApi.updateTask(id, payload);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return updated;
      } catch (err) {
        onError(describeError(err));
        return null;
      }
    },
    [onError]
  );

  return { tasks, loading, loadTasks, toggleStatus, createTask, updateTask };
}
