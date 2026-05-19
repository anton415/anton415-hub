import { useEffect, useMemo, useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import { Label } from "../../app/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "../../app/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../app/components/ui/select";
import { Textarea } from "../../app/components/ui/textarea";
import type {
  TodoProject,
  TodoRepeatFrequency,
  TodoTask,
  TodoTaskPayload
} from "../../app/api/types";
import {
  NO_PROJECT_VALUE,
  priorityLabels,
  priorityOrder,
  repeatLabels
} from "./lib/constants";
import { TaskSubtasks } from "./TaskSubtasks";

type Props = {
  task: TodoTask | null;
  projects: TodoProject[];
  allTasks: TodoTask[];
  onClose: () => void;
  onSave: (payload: TodoTaskPayload) => void | Promise<void>;
  onAddSubtask: (title: string) => void | Promise<void>;
  onToggleStatus: (task: TodoTask) => void;
};

function draftFromTask(task: TodoTask): TodoTaskPayload {
  return {
    project_id: task.project_id,
    parent_task_id: task.parent_task_id,
    title: task.title,
    notes: task.notes,
    url: task.url,
    status: task.status,
    due_date: task.due_date,
    due_time: task.due_time,
    repeat_frequency: task.repeat_frequency,
    repeat_interval: task.repeat_interval,
    repeat_until: task.repeat_until,
    flagged: task.flagged,
    priority: task.priority
  };
}

export function TaskEditSheet({
  task,
  projects,
  allTasks,
  onClose,
  onSave,
  onAddSubtask,
  onToggleStatus
}: Props) {
  const [draft, setDraft] = useState<TodoTaskPayload | null>(task ? draftFromTask(task) : null);

  useEffect(() => {
    setDraft(task ? draftFromTask(task) : null);
  }, [task]);

  const subtasks = useMemo(
    () => (task ? allTasks.filter((t) => t.parent_task_id === task.id) : []),
    [allTasks, task]
  );

  return (
    <Sheet open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Редактировать задачу</SheetTitle>
          <SheetDescription>
            Измените параметры задачи и нажмите Сохранить
          </SheetDescription>
        </SheetHeader>

        {task && draft && (
          <div className="space-y-4 py-4 px-4">
            <div className="space-y-2">
              <Label>Описание</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Проект</Label>
              <Select
                value={draft.project_id == null ? NO_PROJECT_VALUE : String(draft.project_id)}
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    project_id: value === NO_PROJECT_VALUE ? null : Number(value)
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Без проекта" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>Без проекта</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ссылка</Label>
              <Input
                placeholder="https://..."
                value={draft.url ?? ""}
                onChange={(e) => setDraft({ ...draft, url: e.target.value || null })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Дата</Label>
                <Input
                  type="date"
                  value={draft.due_date ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, due_date: e.target.value || null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Время</Label>
                <Input
                  type="time"
                  value={draft.due_time ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, due_time: e.target.value || null })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Повторение</Label>
              <Select
                value={draft.repeat_frequency}
                onValueChange={(value) =>
                  setDraft({ ...draft, repeat_frequency: value as TodoRepeatFrequency })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(repeatLabels) as TodoRepeatFrequency[]).map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {repeatLabels[freq]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Приоритет</Label>
              <div className="flex gap-2 flex-wrap">
                {priorityOrder.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={draft.priority === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDraft({ ...draft, priority: p })}
                  >
                    {priorityLabels[p]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Флажок</Label>
              <Button
                type="button"
                variant={draft.flagged ? "default" : "outline"}
                size="sm"
                onClick={() => setDraft({ ...draft, flagged: !draft.flagged })}
              >
                <Flag className="size-4 mr-2" />
                {draft.flagged ? "С флажком" : "Без флажка"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Заметки</Label>
              <Textarea
                rows={4}
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
              />
            </div>

            <TaskSubtasks
              subtasks={subtasks}
              onAddSubtask={onAddSubtask}
              onToggleStatus={onToggleStatus}
            />
          </div>
        )}

        <SheetFooter className="px-4">
          <Button
            className="w-full"
            onClick={() => {
              if (draft) void onSave(draft);
            }}
          >
            Сохранить
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
