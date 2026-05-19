import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "../../app/components/ui/sheet";
import { AppShell } from "../../app/layouts/AppShell";
import { useAuthGate } from "../../app/hooks/useAuthGate";
import type { TodoTask, TodoTaskPayload } from "../../app/api/types";
import { TaskSidebar } from "./TaskSidebar";
import { TaskList } from "./TaskList";
import { TaskEditSheet } from "./TaskEditSheet";
import {
  ConfirmDeleteProjectDialog,
  EditProjectDialog,
  NewProjectDialog
} from "./ProjectDialog";
import { useProjects } from "./hooks/useProjects";
import { useTasks } from "./hooks/useTasks";
import { buildTaskTree } from "./lib/buildTree";
import { allViews, type Scope } from "./lib/constants";
import { emptyTaskPayload } from "./lib/payloads";

export function TasksPage() {
  const { status } = useAuthGate();

  const [error, setError] = useState<string | undefined>();
  const handleError = useCallback((message: string) => setError(message), []);

  const projectsApi = useProjects(handleError);
  const tasksApi = useTasks(handleError);

  const [scope, setScope] = useState<Scope>({ kind: "view", view: "inbox" });
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<number>>(new Set());
  const [collapsedTasks, setCollapsedTasks] = useState<Set<number>>(new Set());
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoTask | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<typeof projectsApi.projects[number] | null>(null);
  const [isConfirmingDeleteProject, setIsConfirmingDeleteProject] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    void projectsApi.loadProjects();
  }, [status, projectsApi.loadProjects]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void tasksApi.loadTasks(scope);
  }, [status, scope, tasksApi.loadTasks]);

  const taskTree = useMemo(() => buildTaskTree(tasksApi.tasks), [tasksApi.tasks]);

  const scopeTitle = useMemo(() => {
    if (scope.kind === "view") {
      return allViews.find((v) => v.id === scope.view)?.name ?? "Задачи";
    }
    return projectsApi.projectById.get(scope.projectId)?.name ?? "Проект";
  }, [scope, projectsApi.projectById]);

  const handleSelectScope = (next: Scope) => {
    setScope(next);
    setIsMobileSidebarOpen(false);
  };

  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    const created = await tasksApi.createTask(
      emptyTaskPayload({
        title,
        project_id: scope.kind === "project" ? scope.projectId : null
      })
    );
    if (created) setNewTaskTitle("");
  };

  const handleSaveTask = async (payload: TodoTaskPayload) => {
    if (!editingTask) return;
    const updated = await tasksApi.updateTask(editingTask.id, payload);
    if (updated) setEditingTask(null);
  };

  const handleAddSubtask = async (title: string) => {
    if (!editingTask) return;
    await tasksApi.createTask(
      emptyTaskPayload({
        title,
        project_id: editingTask.project_id,
        parent_task_id: editingTask.id
      })
    );
  };

  const handleCreateProject = async (name: string) => {
    const created = await projectsApi.createProject({
      parent_project_id: null,
      name,
      start_date: null,
      end_date: null
    });
    if (created) setNewProjectOpen(false);
  };

  const handleUpdateProject = async (payload: Parameters<typeof projectsApi.updateProject>[1]) => {
    if (!editingProject) return;
    const updated = await projectsApi.updateProject(editingProject.id, payload);
    if (updated) setEditingProject(null);
  };

  const handleConfirmDeleteProject = async () => {
    if (!editingProject) return;
    const ok = await projectsApi.deleteProject(editingProject.id);
    setIsConfirmingDeleteProject(false);
    if (ok) {
      if (scope.kind === "project" && scope.projectId === editingProject.id) {
        setScope({ kind: "view", view: "inbox" });
      }
      setEditingProject(null);
    }
  };

  const toggleProjectCollapse = (id: number) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTaskCollapse = (id: number) => {
    setCollapsedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Загрузка…</div>;
  }

  const sidebarToggle = (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={() => setIsMobileSidebarOpen(true)}
      aria-label="Открыть меню"
    >
      <Menu className="size-5" />
    </Button>
  );

  const sidebar = (
    <TaskSidebar
      scope={scope}
      projectTree={projectsApi.projectTree}
      collapsedProjects={collapsedProjects}
      onToggleProjectCollapse={toggleProjectCollapse}
      onSelectScope={handleSelectScope}
      onOpenNewProject={() => {
        setNewProjectOpen(true);
        setIsMobileSidebarOpen(false);
      }}
      onEditProject={(project) => setEditingProject(project)}
    />
  );

  return (
    <AppShell activeModuleId="tasks" fullHeight leftSlot={sidebarToggle}>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-64 border-r bg-card p-4 flex-col overflow-y-auto">
          {sidebar}
        </aside>

        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="w-64 p-4">
            <SheetHeader className="mb-4">
              <SheetTitle>Меню</SheetTitle>
              <SheetDescription>Навигация по проектам и задачам</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col h-full overflow-y-auto">{sidebar}</div>
          </SheetContent>
        </Sheet>

        <TaskList
          scopeTitle={scopeTitle}
          taskTree={taskTree}
          loading={tasksApi.loading}
          error={error}
          newTaskTitle={newTaskTitle}
          onNewTaskTitleChange={setNewTaskTitle}
          onAddTask={() => void handleAddTask()}
          projectById={projectsApi.projectById}
          collapsedTasks={collapsedTasks}
          onToggleCollapse={toggleTaskCollapse}
          onToggleStatus={(task) => void tasksApi.toggleStatus(task)}
          onOpenTask={(task) => setEditingTask(task)}
        />
      </div>

      <TaskEditSheet
        task={editingTask}
        projects={projectsApi.projects}
        allTasks={tasksApi.tasks}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
        onAddSubtask={handleAddSubtask}
        onToggleStatus={(task) => void tasksApi.toggleStatus(task)}
      />

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onCreate={handleCreateProject}
      />

      <EditProjectDialog
        project={editingProject}
        allProjects={projectsApi.projects}
        onClose={() => setEditingProject(null)}
        onUpdate={handleUpdateProject}
        onRequestDelete={() => setIsConfirmingDeleteProject(true)}
      />

      <ConfirmDeleteProjectDialog
        open={isConfirmingDeleteProject}
        onOpenChange={(open) => {
          if (!open) setIsConfirmingDeleteProject(false);
        }}
        onConfirm={() => void handleConfirmDeleteProject()}
      />
    </AppShell>
  );
}
