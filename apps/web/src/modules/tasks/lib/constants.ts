import {
  Inbox,
  Calendar as CalendarIcon,
  AlertCircle,
  Clock,
  CalendarCheck,
  Flag,
  CheckCircle2,
  CircleDot
} from "lucide-react";
import type {
  TodoRepeatFrequency,
  TodoTaskPriority,
  TodoTaskQuery,
  TodoView
} from "../../../app/api/types";

export type Scope =
  | { kind: "view"; view: TodoView }
  | { kind: "project"; projectId: number };

export const allViews: { id: TodoView; name: string; icon: typeof Inbox; color: string }[] = [
  { id: "inbox", name: "Входящие", icon: Inbox, color: "text-chart-1" },
  { id: "today", name: "Сегодня", icon: CalendarIcon, color: "text-success" },
  { id: "overdue", name: "Просроченные", icon: AlertCircle, color: "text-destructive" },
  { id: "upcoming", name: "Скоро", icon: Clock, color: "text-warning" },
  { id: "scheduled", name: "Запланированные", icon: CalendarCheck, color: "text-chart-3" },
  { id: "flagged", name: "С флажком", icon: Flag, color: "text-chart-4" },
  { id: "all", name: "Всё", icon: CircleDot, color: "text-muted-foreground" },
  { id: "completed", name: "Готово", icon: CheckCircle2, color: "text-chart-2" }
];

export const priorityLabels: Record<TodoTaskPriority, string> = {
  none: "Без приоритета",
  low: "Низкий",
  medium: "Средний",
  high: "Высокий"
};

export const priorityOrder: TodoTaskPriority[] = ["low", "medium", "high", "none"];

export const repeatLabels: Record<TodoRepeatFrequency, string> = {
  none: "Не повторяется",
  daily: "Ежедневно",
  weekdays: "Будни",
  weekends: "Выходные",
  weekly: "Еженедельно",
  monthly: "Ежемесячно",
  yearly: "Ежегодно"
};

export const NO_PROJECT_VALUE = "__none__";

export function buildTaskQuery(scope: Scope): TodoTaskQuery {
  if (scope.kind === "project") return { project_id: scope.projectId };
  switch (scope.view) {
    case "all":
      return {};
    case "completed":
      return { status: "done" };
    default:
      return { view: scope.view };
  }
}

export function formatTaskDate(date: string | null): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
