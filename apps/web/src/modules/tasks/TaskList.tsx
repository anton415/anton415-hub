import { Plus } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import type { TodoProject, TodoTask } from "../../app/api/types";
import { TaskListItem } from "./TaskListItem";
import type { TaskNode } from "./lib/buildTree";

type Props = {
  scopeTitle: string;
  taskTree: TaskNode[];
  loading: boolean;
  error: string | undefined;
  newTaskTitle: string;
  onNewTaskTitleChange: (value: string) => void;
  onAddTask: () => void;
  projectById: Map<number, TodoProject>;
  collapsedTasks: Set<number>;
  onToggleCollapse: (id: number) => void;
  onToggleStatus: (task: TodoTask) => void;
  onOpenTask: (task: TodoTask) => void;
};

export function TaskList({
  scopeTitle,
  taskTree,
  loading,
  error,
  newTaskTitle,
  onNewTaskTitleChange,
  onAddTask,
  projectById,
  collapsedTasks,
  onToggleCollapse,
  onToggleStatus,
  onOpenTask
}: Props) {
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b p-3 md:p-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Новая задача — ${scopeTitle}`}
            value={newTaskTitle}
            onChange={(e) => onNewTaskTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAddTask();
            }}
            className="flex-1 h-9"
          />
          <Button
            size="icon"
            onClick={onAddTask}
            className="h-9 w-9 shrink-0"
            aria-label="Добавить задачу"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        <div className="max-w-4xl mx-auto space-y-1">
          {loading && taskTree.length === 0 ? (
            <p className="text-muted-foreground text-sm px-3">Загрузка…</p>
          ) : taskTree.length === 0 ? (
            <p className="text-muted-foreground text-sm px-3">Задач нет</p>
          ) : (
            taskTree.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                projectById={projectById}
                collapsedTasks={collapsedTasks}
                onToggleCollapse={onToggleCollapse}
                onToggleStatus={onToggleStatus}
                onOpenTask={onOpenTask}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
