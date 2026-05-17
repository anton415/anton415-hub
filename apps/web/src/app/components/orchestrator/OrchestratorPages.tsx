import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Check,
  Circle,
  Clock,
  ExternalLink,
  GitBranch,
  Github,
  ListChecks,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Workflow,
  X
} from "lucide-react";
import { orchestratorApi } from "../../api";
import type {
  OrchestratorArtifact,
  OrchestratorEvent,
  OrchestratorProject,
  OrchestratorWorkflowDetail,
  OrchestratorWorkflowStatus,
  OrchestratorWorkflowSummary
} from "../../api/types";
import { logoutAndRedirect, useAuthGate } from "../../hooks/useAuthGate";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

type LoadState<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T }
  | { kind: "error"; message: string };

type HomeData = {
  projects: OrchestratorProject[];
  workflows: OrchestratorWorkflowSummary[];
};

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

const initialProjectForm = {
  name: "Anton415 Hub",
  github_owner: "anton415",
  github_repo: "anton415-hub",
  default_branch: "main"
};

const initialWorkflowForm = {
  project_id: "",
  title: "",
  module: "",
  problem: ""
};

export function OrchestratorHomePage() {
  const { status } = useAuthGate();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState<HomeData>>({ kind: "loading" });
  const [workflowForm, setWorkflowForm] = useState(initialWorkflowForm);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [projects, workflows] = await Promise.all([
        orchestratorApi.listProjects(),
        orchestratorApi.listWorkflows()
      ]);
      setState({ kind: "ready", data: { projects, workflows } });
      setWorkflowForm((current) => ({
        ...current,
        project_id: current.project_id || projects[0]?.id || ""
      }));
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    if (state.kind !== "ready") {
      return { projects: 0, active: 0, ready: 0, failed: 0 };
    }
    return {
      projects: state.data.projects.length,
      active: state.data.workflows.filter((item) => activeWorkflow(item.workflow.status)).length,
      ready: state.data.workflows.filter((item) => item.workflow.status === "ready_for_implementation").length,
      failed: state.data.workflows.filter((item) => item.workflow.status === "failed").length
    };
  }, [state]);

  async function createWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setFormError(undefined);
    try {
      const workflow = await orchestratorApi.createWorkflow({
        project_id: workflowForm.project_id,
        title: workflowForm.title,
        module: emptyToNull(workflowForm.module),
        problem: workflowForm.problem
      });
      navigate(`/orchestrator/workflows/${workflow.workflow.id}`);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  if (status === "loading" || state.kind === "loading") {
    return <LoadingScreen label="Загрузка orchestrator..." />;
  }

  return (
    <OrchestratorFrame title="AI Orchestrator" subtitle="Controlled AI engineering workflow">
      {state.kind === "error" ? (
        <ErrorPanel message={state.message} onRetry={load} />
      ) : (
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Projects" value={summary.projects} />
            <Metric label="Active workflows" value={summary.active} />
            <Metric label="Ready" value={summary.ready} />
            <Metric label="Failed" value={summary.failed} tone={summary.failed > 0 ? "danger" : "default"} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-lg border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                  <h2 className="text-base font-medium">Latest workflows</h2>
                  <p className="text-sm text-muted-foreground">{state.data.workflows.length} total</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/orchestrator/demo">
                      <Play className="size-4" />
                      Demo
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/orchestrator/projects">
                      <Github className="size-4" />
                      Projects
                    </Link>
                  </Button>
                </div>
              </div>
              <WorkflowList workflows={state.data.workflows.slice(0, 8)} />
            </section>

            <section className="rounded-lg border bg-card">
              <div className="border-b px-5 py-4">
                <h2 className="text-base font-medium">Create workflow</h2>
              </div>
              <form className="grid gap-4 p-5" onSubmit={createWorkflow}>
                <Field label="Project">
                  <select
                    className="h-9 rounded-md border bg-input-background px-3 text-sm"
                    value={workflowForm.project_id}
                    onChange={(event) => setWorkflowForm({ ...workflowForm, project_id: event.target.value })}
                    required
                  >
                    {state.data.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} · {repoName(project)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Title">
                  <Input
                    value={workflowForm.title}
                    onChange={(event) => setWorkflowForm({ ...workflowForm, title: event.target.value })}
                    placeholder="Add task filtering"
                    required
                  />
                </Field>
                <Field label="Module">
                  <Input
                    value={workflowForm.module}
                    onChange={(event) => setWorkflowForm({ ...workflowForm, module: event.target.value })}
                    placeholder="todo"
                  />
                </Field>
                <Field label="Problem">
                  <Textarea
                    value={workflowForm.problem}
                    onChange={(event) => setWorkflowForm({ ...workflowForm, problem: event.target.value })}
                    placeholder="I want to filter tasks by active, done and archived"
                    required
                  />
                </Field>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <Button type="submit" disabled={creating || state.data.projects.length === 0}>
                  <Plus className="size-4" />
                  {creating ? "Creating..." : "Create Workflow"}
                </Button>
              </form>
            </section>
          </div>

          <section className="rounded-lg border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-medium">Connected projects</h2>
            </div>
            <ProjectRows projects={state.data.projects.slice(0, 5)} />
          </section>
        </main>
      )}
    </OrchestratorFrame>
  );
}

export function OrchestratorProjectsPage() {
  const { status } = useAuthGate();
  const [state, setState] = useState<LoadState<OrchestratorProject[]>>({ kind: "loading" });
  const [form, setForm] = useState(initialProjectForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", data: await orchestratorApi.listProjects() });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(undefined);
    try {
      await orchestratorApi.createProject(form);
      setForm(initialProjectForm);
      await load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || state.kind === "loading") {
    return <LoadingScreen label="Загрузка проектов..." />;
  }

  return (
    <OrchestratorFrame title="Projects" subtitle="Connected GitHub repositories">
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {state.kind === "error" ? (
          <ErrorPanel message={state.message} onRetry={load} />
        ) : (
          <>
            <section className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="text-base font-medium">Repositories</h2>
                <Button variant="outline" asChild>
                  <Link to="/orchestrator">
                    <ArrowLeft className="size-4" />
                    Back
                  </Link>
                </Button>
              </div>
              <ProjectRows projects={state.data} />
            </section>

            <section className="rounded-lg border bg-card">
              <div className="border-b px-5 py-4">
                <h2 className="text-base font-medium">Connect repo</h2>
              </div>
              <form className="grid gap-4 p-5" onSubmit={createProject}>
                <Field label="Name">
                  <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                </Field>
                <Field label="GitHub owner">
                  <Input
                    value={form.github_owner}
                    onChange={(event) => setForm({ ...form, github_owner: event.target.value })}
                    required
                  />
                </Field>
                <Field label="GitHub repo">
                  <Input
                    value={form.github_repo}
                    onChange={(event) => setForm({ ...form, github_repo: event.target.value })}
                    required
                  />
                </Field>
                <Field label="Default branch">
                  <Input
                    value={form.default_branch}
                    onChange={(event) => setForm({ ...form, default_branch: event.target.value })}
                    required
                  />
                </Field>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <Button type="submit" disabled={saving}>
                  <Github className="size-4" />
                  {saving ? "Connecting..." : "Connect Repo"}
                </Button>
              </form>
            </section>
          </>
        )}
      </main>
    </OrchestratorFrame>
  );
}

export function OrchestratorWorkflowPage() {
  const { status } = useAuthGate();
  const params = useParams();
  const workflowId = params.workflowId ?? "";
  const [state, setState] = useState<LoadState<OrchestratorWorkflowDetail>>({ kind: "loading" });
  const [comment, setComment] = useState("");
  const [savingAction, setSavingAction] = useState<string | undefined>();
  const [actionError, setActionError] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!workflowId) {
      setState({ kind: "error", message: "Workflow id is missing" });
      return;
    }
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", data: await orchestratorApi.getWorkflow(workflowId) });
    } catch (error) {
      setState({ kind: "error", message: errorMessage(error) });
    }
  }, [workflowId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(
    label: string,
    action: (id: string, comment: string | null) => Promise<OrchestratorWorkflowDetail>
  ) {
    setSavingAction(label);
    setActionError(undefined);
    try {
      const detail = await action(workflowId, emptyToNull(comment));
      setState({ kind: "ready", data: detail });
      setComment("");
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSavingAction(undefined);
    }
  }

  if (status === "loading" || state.kind === "loading") {
    return <LoadingScreen label="Загрузка workflow..." />;
  }

  return (
    <OrchestratorFrame
      title={state.kind === "ready" ? state.data.workflow.title : "Workflow"}
      subtitle={state.kind === "ready" ? repoName(state.data.project) : "Orchestrator workflow"}
    >
      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        {state.kind === "error" ? (
          <ErrorPanel message={state.message} onRetry={load} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-6">
              <section className="rounded-lg border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={state.data.workflow.status} />
                    <span className="text-sm text-muted-foreground">{state.data.workflow.feature_id}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load}>
                      <RefreshCw className="size-4" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/orchestrator">
                        <ArrowLeft className="size-4" />
                        Back
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-3">
                  <InfoCell label="Project" value={state.data.project.name} />
                  <InfoCell label="Module" value={state.data.workflow.module ?? "none"} />
                  <InfoCell label="Updated" value={formatDate(state.data.workflow.updated_at)} />
                  <div className="md:col-span-3">
                    <p className="text-sm text-muted-foreground">Problem</p>
                    <p className="mt-1 text-sm leading-6">{state.data.workflow.problem}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border bg-card">
                <div className="border-b px-5 py-4">
                  <h2 className="text-base font-medium">Timeline</h2>
                </div>
                <div className="grid gap-3 p-5">
                  {state.data.steps.map((step) => (
                    <div key={step.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2">
                      <StepIcon status={step.status} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{step.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{step.agent ?? "system"} · {step.step_key}</p>
                      </div>
                      <Badge variant={step.status === "failed" ? "destructive" : "outline"}>{step.status}</Badge>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border bg-card">
                <div className="border-b px-5 py-4">
                  <h2 className="text-base font-medium">Events</h2>
                </div>
                <EventRows events={state.data.events} />
              </section>
            </div>

            <aside className="grid content-start gap-6">
              <section className="rounded-lg border bg-card">
                <div className="border-b px-5 py-4">
                  <h2 className="text-base font-medium">Actions</h2>
                </div>
                <div className="grid gap-3 p-5">
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Approval comment"
                  />
                  {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                  <Button
                    variant="outline"
                    disabled={Boolean(savingAction)}
                    onClick={() => runAction("approve-spec", orchestratorApi.approveSpec.bind(orchestratorApi))}
                  >
                    <ShieldCheck className="size-4" />
                    Approve Spec
                  </Button>
                  <Button
                    variant="outline"
                    disabled={Boolean(savingAction)}
                    onClick={() => runAction("request-spec", orchestratorApi.requestSpecChanges.bind(orchestratorApi))}
                  >
                    <ListChecks className="size-4" />
                    Request Spec Changes
                  </Button>
                  <Button
                    variant="outline"
                    disabled={Boolean(savingAction)}
                    onClick={() => runAction("approve-architecture", orchestratorApi.approveArchitecture.bind(orchestratorApi))}
                  >
                    <Check className="size-4" />
                    Approve Architecture
                  </Button>
                  <Button
                    variant="outline"
                    disabled={Boolean(savingAction)}
                    onClick={() => runAction("request-architecture", orchestratorApi.requestArchitectureChanges.bind(orchestratorApi))}
                  >
                    <GitBranch className="size-4" />
                    Request Architecture Changes
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={Boolean(savingAction)}
                    onClick={() => runAction("reject", orchestratorApi.reject.bind(orchestratorApi))}
                  >
                    <X className="size-4" />
                    Reject
                  </Button>
                </div>
              </section>

              <section className="rounded-lg border bg-card">
                <div className="border-b px-5 py-4">
                  <h2 className="text-base font-medium">Artifacts</h2>
                </div>
                <ArtifactRows artifacts={state.data.artifacts} />
              </section>

              <section className="rounded-lg border bg-card">
                <div className="border-b px-5 py-4">
                  <h2 className="text-base font-medium">Approvals</h2>
                </div>
                <div className="grid gap-3 p-5">
                  {state.data.approvals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No approvals yet</p>
                  ) : (
                    state.data.approvals.map((approval) => (
                      <div key={approval.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">{approval.decision}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(approval.decided_at)}</span>
                        </div>
                        <p className="mt-2 text-sm">{approval.step_key}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{approval.decided_by}</p>
                        {approval.comment && <p className="mt-2 text-sm">{approval.comment}</p>}
                      </div>
                    ))
                  )}
                </div>
              </section>

              {(state.data.workflow.github_issue_url || state.data.workflow.github_pr_url || state.data.workflow.n8n_execution_id) && (
                <section className="rounded-lg border bg-card p-5">
                  <div className="grid gap-2">
                    {state.data.workflow.github_issue_url && <ExternalAnchor href={state.data.workflow.github_issue_url} label="GitHub issue" />}
                    {state.data.workflow.github_pr_url && <ExternalAnchor href={state.data.workflow.github_pr_url} label="GitHub PR" />}
                    {state.data.workflow.n8n_execution_id && (
                      <p className="text-sm text-muted-foreground">n8n: {state.data.workflow.n8n_execution_id}</p>
                    )}
                  </div>
                </section>
              )}
            </aside>
          </div>
        )}
      </main>
    </OrchestratorFrame>
  );
}

export function OrchestratorDemoPage() {
  const { status } = useAuthGate();
  const [stage, setStage] = useState(0);

  const demoSteps = [
    "Idea created",
    "ChatGPT spec generated",
    "Spec approved",
    "Claude architecture generated",
    "Architecture approved",
    "Codex prompt generated",
    "Ready for implementation"
  ];
  const artifacts = [
    { title: "System specification", visible: stage >= 1 },
    { title: "Architecture plan", visible: stage >= 3 },
    { title: "Codex implementation prompt", visible: stage >= 5 },
    { title: "GitHub issue", visible: stage >= 6 }
  ];

  if (status === "loading") {
    return <LoadingScreen label="Загрузка demo..." />;
  }

  return (
    <OrchestratorFrame title="Demo Mode" subtitle="Local replay">
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="text-base font-medium">Add task filtering to Todo module</h2>
              <p className="text-sm text-muted-foreground">anton415/anton415-hub</p>
            </div>
            <StatusBadge status={stage >= 6 ? "ready_for_implementation" : "system_analysis_running"} />
          </div>
          <div className="grid gap-3 p-5">
            {demoSteps.map((step, index) => (
              <div key={step} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2">
                <StepIcon status={index < stage ? "done" : index === stage ? "running" : "pending"} />
                <span className="truncate text-sm font-medium">{step}</span>
                <Badge variant="outline">{index < stage ? "done" : index === stage ? "running" : "pending"}</Badge>
              </div>
            ))}
          </div>
        </section>

        <aside className="grid content-start gap-6">
          <section className="rounded-lg border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-medium">Controls</h2>
            </div>
            <div className="grid gap-3 p-5">
              <Button onClick={() => setStage(1)} disabled={stage !== 0}>
                <Play className="size-4" />
                Start Demo
              </Button>
              <Button variant="outline" onClick={() => setStage((current) => Math.min(current + 1, 6))} disabled={stage === 0 || stage >= 6}>
                <Check className="size-4" />
                Next Step
              </Button>
              <Button variant="outline" onClick={() => setStage(0)}>
                <RotateCcw className="size-4" />
                Reset Demo
              </Button>
              <Button variant="outline" asChild>
                <Link to="/orchestrator">
                  <ArrowLeft className="size-4" />
                  Back
                </Link>
              </Button>
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-medium">Artifacts</h2>
            </div>
            <div className="grid gap-3 p-5">
              {artifacts.map((artifact) => (
                <div key={artifact.title} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">{artifact.title}</span>
                  <Badge variant={artifact.visible ? "default" : "outline"}>{artifact.visible ? "ready" : "pending"}</Badge>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </OrchestratorFrame>
  );
}

function OrchestratorFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
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

function WorkflowList({ workflows }: { workflows: OrchestratorWorkflowSummary[] }) {
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

function ProjectRows({ projects }: { projects: OrchestratorProject[] }) {
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

function ArtifactRows({ artifacts }: { artifacts: OrchestratorArtifact[] }) {
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

function EventRows({ events }: { events: OrchestratorEvent[] }) {
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

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "danger" }) {
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: OrchestratorWorkflowStatus }) {
  const variant = status === "failed" || status === "rejected" ? "destructive" : status === "ready_for_implementation" ? "default" : "outline";
  return <Badge variant={variant}>{statusLabels[status] ?? status}</Badge>;
}

function StepIcon({ status }: { status: "pending" | "running" | "done" | "failed" | "skipped" }) {
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

function ExternalAnchor({ href, label }: { href: string; label: string }) {
  return (
    <a className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline" href={href} target="_blank" rel="noreferrer">
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{label}</div>;
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
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

function repoName(project: OrchestratorProject) {
  return `${project.github_owner}/${project.github_repo}`;
}

function activeWorkflow(status: OrchestratorWorkflowStatus) {
  return !["done", "failed", "rejected", "ready_for_implementation"].includes(status);
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось выполнить запрос";
}
