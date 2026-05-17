import { type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Check, Circle, Clock, ExternalLink, RefreshCw, Workflow, X } from "lucide-react";
import type {
  OrchestratorArtifact,
  OrchestratorEvent,
  OrchestratorProject,
  OrchestratorStepStatus,
  OrchestratorWorkflowStatus,
  OrchestratorWorkflowSummary
} from "../../api/types";
import { logoutAndRedirect } from "../../hooks/useAuthGate";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";

export type LoadState<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T }
  | { kind: "error"; message: string };

const statusLabels: Record<OrchestratorWorkflowStatus, string> = {
  draft: "Draft",
  system_analysis_running: "System analysis",
  spec_review: "Spec review",
  spec_approved: "Spec approved",
  spec_changes_requested: "Spec changes",
  architecture_running: "Architecture",
  architecture_review: "Architecture review",
  architecture_approved: "Architecture approved",
  architecture_changes_requested: "Architecture changes",
  ready_for_implementation: "Ready",
  implementation_running: "Implementation",
  pr_review: "PR review",
  done: "Done",
  failed: "Failed",
  rejected: "Rejected"
};

export function OrchestratorFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-primary p-2 text-primary-foreground">
              <Workflow className="size-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl">{title}</h1>
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/">Hub</Link>
            </Button>
            <Button variant="outline" onClick={() => logoutAndRedirect(navigate)}>
              Выход
            </Button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function WorkflowList({ workflows }: { workflows: OrchestratorWorkflowSummary[] }) {
  if (workflows.length === 0) {
    return <p className="p-5 text-sm text-muted-foreground">No workflows yet</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-medium">Feature</th>
            <th className="px-5 py-3 font-medium">Project</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Updated</th>
            <th className="px-5 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {workflows.map((item) => (
            <tr key={item.workflow.id} className="border-b last:border-0">
              <td className="px-5 py-3">
                <div className="max-w-[280px] truncate font-medium">{item.workflow.title}</div>
                <div className="max-w-[280px] truncate text-xs text-muted-foreground">{item.workflow.feature_id}</div>
              </td>
              <td className="px-5 py-3">{item.project.name}</td>
              <td className="px-5 py-3">
                <StatusBadge status={item.workflow.status} />
              </td>
              <td className="px-5 py-3 text-muted-foreground">{formatDate(item.workflow.updated_at)}</td>
              <td className="px-5 py-3 text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/orchestrator/workflows/${item.workflow.id}`}>Open</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProjectRows({ projects }: { projects: OrchestratorProject[] }) {
  if (projects.length === 0) {
    return <p className="p-5 text-sm text-muted-foreground">No connected projects</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-medium">Project</th>
            <th className="px-5 py-3 font-medium">Repository</th>
            <th className="px-5 py-3 font-medium">Branch</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="border-b last:border-0">
              <td className="px-5 py-3 font-medium">{project.name}</td>
              <td className="px-5 py-3">{repoName(project)}</td>
              <td className="px-5 py-3 text-muted-foreground">{project.default_branch}</td>
              <td className="px-5 py-3">
                <Badge variant={project.status === "active" ? "default" : "outline"}>{project.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ArtifactRows({ artifacts }: { artifacts: OrchestratorArtifact[] }) {
  if (artifacts.length === 0) {
    return <p className="p-5 text-sm text-muted-foreground">No artifacts yet</p>;
  }
  return (
    <div className="grid gap-3 p-5">
      {artifacts.map((artifact) => (
        <div key={artifact.id} className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline">{artifact.artifact_type}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(artifact.created_at)}</span>
          </div>
          <p className="mt-2 text-sm font-medium">{artifact.title}</p>
          {artifact.github_url && <ExternalAnchor href={artifact.github_url} label="Open artifact" />}
        </div>
      ))}
    </div>
  );
}

export function EventRows({ events }: { events: OrchestratorEvent[] }) {
  if (events.length === 0) {
    return <p className="p-5 text-sm text-muted-foreground">No events yet</p>;
  }
  return (
    <div className="divide-y">
      {events.map((event) => (
        <div key={event.id} className="grid gap-1 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{event.source}</Badge>
            <span className="text-sm font-medium">{event.event_type}</span>
            <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
          </div>
          <p className="text-sm text-muted-foreground">{event.message}</p>
        </div>
      ))}
    </div>
  );
}

export function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "danger" }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={tone === "danger" ? "text-2xl font-medium text-destructive" : "text-2xl font-medium"}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: OrchestratorWorkflowStatus }) {
  const variant = status === "failed" || status === "rejected" ? "destructive" : status === "ready_for_implementation" ? "default" : "outline";
  return <Badge variant={variant}>{statusLabels[status] ?? status}</Badge>;
}

export function StepIcon({ status }: { status: OrchestratorStepStatus }) {
  if (status === "done") {
    return <Check className="size-5 text-primary" />;
  }
  if (status === "running") {
    return <Clock className="size-5 text-chart-3" />;
  }
  if (status === "failed") {
    return <X className="size-5 text-destructive" />;
  }
  return <Circle className="size-5 text-muted-foreground" />;
}

export function ExternalAnchor({ href, label }: { href: string; label: string }) {
  return (
    <a className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline" href={href} target="_blank" rel="noreferrer">
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}

export function LoadingScreen({ label }: { label: string }) {
  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{label}</div>;
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-sm text-destructive">{message}</p>
      <Button className="mt-4" variant="outline" onClick={onRetry}>
        <RefreshCw className="size-4" />
        Retry
      </Button>
    </div>
  );
}

export function repoName(project: OrchestratorProject) {
  return `${project.github_owner}/${project.github_repo}`;
}

export function activeWorkflow(status: OrchestratorWorkflowStatus) {
  return !["done", "failed", "rejected", "ready_for_implementation"].includes(status);
}

export function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось выполнить запрос";
}
