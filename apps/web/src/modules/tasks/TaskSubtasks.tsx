import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../app/components/ui/button";
import { Checkbox } from "../../app/components/ui/checkbox";
import { Input } from "../../app/components/ui/input";
import { Label } from "../../app/components/ui/label";
import type { TodoTask } from "../../app/api/types";

type Props = {
  subtasks: TodoTask[];
  onAddSubtask: (title: string) => void | Promise<void>;
  onToggleStatus: (task: TodoTask) => void;
};

export function TaskSubtasks({ subtasks, onAddSubtask, onToggleStatus }: Props) {
  const [title, setTitle] = useState("");

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    void onAddSubtask(trimmed);
    setTitle("");
  };

  return (
    <div className="space-y-2">
      <Label>Подзадачи</Label>
      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 p-2 rounded-lg border"
          >
            <Checkbox
              checked={subtask.status === "done"}
              onCheckedChange={() => onToggleStatus(subtask)}
            />
            <span
              className={`flex-1 text-sm ${
                subtask.status === "done" ? "line-through text-muted-foreground" : ""
              }`}
            >
              {subtask.title}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Добавить подзадачу"
            className="flex-1 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={submit}
            aria-label="Добавить подзадачу"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
