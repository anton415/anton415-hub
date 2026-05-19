import { ChevronRight, ChevronDown, Flag, MoreHorizontal } from "lucide-react";
import { Checkbox } from "../../app/components/ui/checkbox";
import { Badge } from "../../app/components/ui/badge";
import type { TodoProject, TodoTask } from "../../app/api/types";
import type { TaskNode } from "./lib/buildTree";
import { formatTaskDate, priorityLabels } from "./lib/constants";

type Props = {
  task: TaskNode;
  level?: number;
  projectById: Map<number, TodoProject>;
  collapsedTasks: Set<number>;
  onToggleCollapse: (id: number) => void;
  onToggleStatus: (task: TodoTask) => void;
  onOpenTask: (task: TodoTask) => void;
};

export function TaskListItem({
  task,
  level = 0,
  projectById,
  collapsedTasks,
  onToggleCollapse,
  onToggleStatus,
  onOpenTask
}: Props) {
  const hasSubtasks = task.children.length > 0;
  const isCollapsed = collapsedTasks.has(task.id);
  const completed = task.status === "done";
  const projectName = task.project_id ? projectById.get(task.project_id)?.name : undefined;

  return (
    <div>
      <div
        className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
        style={{ paddingLeft: `${12 + level * 24}px` }}
        onClick={() => onOpenTask(task)}
      >
        {hasSubtasks ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(task.id);
            }}
            aria-label={
              isCollapsed
                ? `Развернуть подзадачи: ${task.title}`
                : `Свернуть подзадачи: ${task.title}`
            }
            aria-expanded={!isCollapsed}
            className="hover:bg-accent/50 rounded p-0.5 cursor-pointer shrink-0 mt-0.5"
          >
            {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        ) : level > 0 ? (
          <div className="w-4" />
        ) : null}
        <Checkbox
          checked={completed}
          onCheckedChange={() => onToggleStatus(task)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm md:text-base ${completed ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </p>
            {hasSubtasks && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {task.children.filter((c) => c.status === "done").length}/{task.children.length}
              </span>
            )}
            {task.flagged && <Flag className="size-3 text-chart-4" />}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {projectName && (
              <Badge variant="outline" className="text-xs">
                {projectName}
              </Badge>
            )}
            {task.due_date && (
              <span className="text-xs text-muted-foreground">{formatTaskDate(task.due_date)}</span>
            )}
            {task.priority !== "none" && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {priorityLabels[task.priority]}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTask(task);
          }}
          aria-label={`Открыть задачу: ${task.title}`}
          className="opacity-0 group-hover:opacity-100 p-1 shrink-0"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
      {hasSubtasks &&
        !isCollapsed &&
        task.children.map((child) => (
          <TaskListItem
            key={child.id}
            task={child}
            level={level + 1}
            projectById={projectById}
            collapsedTasks={collapsedTasks}
            onToggleCollapse={onToggleCollapse}
            onToggleStatus={onToggleStatus}
            onOpenTask={onOpenTask}
          />
        ))}
    </div>
  );
}
