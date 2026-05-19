import {
  Calendar,
  CheckSquare,
  Target,
  TrendingUp,
  Wallet,
  Workflow,
  type LucideIcon
} from "lucide-react";

export type ModuleStatus = "active" | "coming-soon";

export type ModuleConfig = {
  id: string;
  title: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  status: ModuleStatus;
  color: string;
  path: string;
};

export const modules: ModuleConfig[] = [
  {
    id: "tasks",
    title: "Задачи",
    shortName: "Задачи",
    description: "Управление задачами и проектами",
    icon: CheckSquare,
    status: "active",
    color: "bg-chart-1",
    path: "/tasks"
  },
  {
    id: "finances",
    title: "Личные финансы",
    shortName: "Финансы",
    description: "Учет доходов и расходов",
    icon: Wallet,
    status: "active",
    color: "bg-chart-2",
    path: "/finances"
  },
  {
    id: "investments",
    title: "Инвестиции",
    shortName: "Инвестиции",
    description: "Портфель и аналитика",
    icon: TrendingUp,
    status: "coming-soon",
    color: "bg-chart-3",
    path: "/investments"
  },
  {
    id: "fire",
    title: "FIRE дашбоард",
    shortName: "FIRE",
    description: "Отслеживание прогресса к финансовой независимости",
    icon: Target,
    status: "coming-soon",
    color: "bg-chart-4",
    path: "/fire"
  },
  {
    id: "calendar",
    title: "Календарь",
    shortName: "Календарь",
    description: "Планирование и события",
    icon: Calendar,
    status: "coming-soon",
    color: "bg-chart-5",
    path: "/calendar"
  },
  {
    id: "orchestrator",
    title: "AI Orchestrator",
    shortName: "Orchestrator",
    description: "Workflow для AI-разработки",
    icon: Workflow,
    status: "active",
    color: "bg-primary",
    path: "/orchestrator"
  }
];
