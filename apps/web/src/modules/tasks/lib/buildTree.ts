import type { TodoProject, TodoTask } from "../../../app/api/types";

export type ProjectNode = TodoProject & { children: ProjectNode[] };
export type TaskNode = TodoTask & { children: TaskNode[] };

export function buildProjectTree(projects: TodoProject[]): ProjectNode[] {
  const map = new Map<number, ProjectNode>();
  projects.forEach((p) => map.set(p.id, { ...p, children: [] }));
  const roots: ProjectNode[] = [];
  map.forEach((node) => {
    if (node.parent_project_id != null && map.has(node.parent_project_id)) {
      map.get(node.parent_project_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function buildTaskTree(tasks: TodoTask[]): TaskNode[] {
  const map = new Map<number, TaskNode>();
  tasks.forEach((t) => map.set(t.id, { ...t, children: [] }));
  const roots: TaskNode[] = [];
  map.forEach((node) => {
    if (node.parent_task_id != null && map.has(node.parent_task_id)) {
      map.get(node.parent_task_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}
