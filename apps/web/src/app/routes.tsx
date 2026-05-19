import { createBrowserRouter, Outlet } from "react-router";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { TasksPage } from "../modules/tasks/TasksPage";
import { FinancesPage } from "./components/FinancesPage";
import { CalendarComingSoon } from "./components/CalendarComingSoon";
import { OrchestratorHomePage } from "./components/orchestrator/OrchestratorHomePage";
import { OrchestratorProjectsPage } from "./components/orchestrator/OrchestratorProjectsPage";
import { OrchestratorWorkflowPage } from "./components/orchestrator/OrchestratorWorkflowPage";
import { RouteErrorBoundary } from "./ErrorBoundary";

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        path: "/",
        Component: Dashboard,
      },
      {
        path: "/login",
        Component: LoginPage,
      },
      {
        path: "/tasks",
        Component: TasksPage,
      },
      {
        // Backend auth flows default to /todo (internal/auth/adapters/http/handler.go).
        path: "/todo",
        Component: TasksPage,
      },
      {
        path: "/finances",
        Component: FinancesPage,
      },
      {
        path: "/investments",
        element: <div className="p-8">Страница инвестиций (в разработке)</div>,
      },
      {
        path: "/fire",
        element: <div className="p-8">FIRE дашбоард (в разработке)</div>,
      },
      {
        path: "/calendar",
        Component: CalendarComingSoon,
      },
      {
        path: "/orchestrator",
        Component: OrchestratorHomePage,
      },
      {
        path: "/orchestrator/projects",
        Component: OrchestratorProjectsPage,
      },
      {
        path: "/orchestrator/workflows/:workflowId",
        Component: OrchestratorWorkflowPage,
      },
      {
        path: "*",
        element: <div className="p-8">Страница не найдена</div>,
      },
    ],
  },
]);
