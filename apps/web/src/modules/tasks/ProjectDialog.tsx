import { useEffect, useState } from "react";
import { Button } from "../../app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../app/components/ui/dialog";
import { Input } from "../../app/components/ui/input";
import { Label } from "../../app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../app/components/ui/select";
import type { TodoProject, TodoProjectPayload } from "../../app/api/types";
import { NO_PROJECT_VALUE } from "./lib/constants";

type NewProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void | Promise<void>;
};

export function NewProjectDialog({ open, onOpenChange, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    void onCreate(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый проект</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Название проекта</Label>
            <Input
              id="project-name"
              placeholder="Введите название проекта"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit}>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EditProjectDialogProps = {
  project: TodoProject | null;
  allProjects: TodoProject[];
  onClose: () => void;
  onUpdate: (payload: TodoProjectPayload) => void | Promise<void>;
  onRequestDelete: () => void;
};

function draftFromProject(project: TodoProject): TodoProjectPayload {
  return {
    parent_project_id: project.parent_project_id,
    name: project.name,
    start_date: project.start_date,
    end_date: project.end_date
  };
}

export function EditProjectDialog({
  project,
  allProjects,
  onClose,
  onUpdate,
  onRequestDelete
}: EditProjectDialogProps) {
  const [draft, setDraft] = useState<TodoProjectPayload | null>(
    project ? draftFromProject(project) : null
  );

  useEffect(() => {
    setDraft(project ? draftFromProject(project) : null);
  }, [project]);

  return (
    <Dialog
      open={project !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать проект</DialogTitle>
        </DialogHeader>
        {project && draft && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Название проекта</Label>
              <Input
                id="edit-project-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Родительский проект</Label>
              <Select
                value={
                  draft.parent_project_id == null
                    ? NO_PROJECT_VALUE
                    : String(draft.parent_project_id)
                }
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    parent_project_id: value === NO_PROJECT_VALUE ? null : Number(value)
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Нет родительского проекта" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>Нет родительского проекта</SelectItem>
                  {allProjects
                    .filter((p) => p.id !== project.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Начало</Label>
                <Input
                  type="date"
                  value={draft.start_date ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, start_date: e.target.value || null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Конец</Label>
                <Input
                  type="date"
                  value={draft.end_date ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, end_date: e.target.value || null })
                  }
                />
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={onRequestDelete}
            className="sm:mr-auto"
          >
            Удалить проект
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (draft) void onUpdate(draft);
              }}
              className="flex-1 sm:flex-none"
            >
              Сохранить
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ConfirmDeleteProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ConfirmDeleteProjectDialog({
  open,
  onOpenChange,
  onConfirm
}: ConfirmDeleteProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить проект?</DialogTitle>
          <DialogDescription>
            Задачи также будут удалены. Это действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-1 sm:flex-none"
          >
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
