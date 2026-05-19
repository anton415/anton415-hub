import { useCallback, useMemo, useState } from "react";
import { todoApi } from "../../../app/api";
import type { TodoProject, TodoProjectPayload } from "../../../app/api/types";
import { buildProjectTree } from "../lib/buildTree";
import { describeError } from "../lib/describeError";

export type UseProjects = ReturnType<typeof useProjects>;

export function useProjects(onError: (message: string) => void) {
  const [projects, setProjects] = useState<TodoProject[]>([]);

  const loadProjects = useCallback(async () => {
    try {
      const list = await todoApi.listProjects();
      setProjects(list);
    } catch (err) {
      onError(describeError(err));
    }
  }, [onError]);

  const createProject = useCallback(
    async (payload: TodoProjectPayload) => {
      try {
        const created = await todoApi.createProject(payload);
        setProjects((prev) => [...prev, created]);
        return created;
      } catch (err) {
        onError(describeError(err));
        return null;
      }
    },
    [onError]
  );

  const updateProject = useCallback(
    async (id: number, payload: TodoProjectPayload) => {
      try {
        const updated = await todoApi.updateProject(id, payload);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        return updated;
      } catch (err) {
        onError(describeError(err));
        return null;
      }
    },
    [onError]
  );

  const deleteProject = useCallback(
    async (id: number) => {
      try {
        await todoApi.deleteProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        return true;
      } catch (err) {
        onError(describeError(err));
        return false;
      }
    },
    [onError]
  );

  const projectTree = useMemo(() => buildProjectTree(projects), [projects]);
  const projectById = useMemo(() => {
    const m = new Map<number, TodoProject>();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  return {
    projects,
    projectTree,
    projectById,
    loadProjects,
    createProject,
    updateProject,
    deleteProject
  };
}
