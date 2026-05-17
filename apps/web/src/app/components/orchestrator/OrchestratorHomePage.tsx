import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Github, Plus } from "lucide-react";
import { orchestratorApi } from "../../api";
import type { OrchestratorProject, OrchestratorWorkflowSummary } from "../../api/types";
import { useAuthGate } from "../../hooks/useAuthGate";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  type LoadState,
  ErrorPanel,
  Field,
  LoadingScreen,
  Metric,
  OrchestratorFrame,
  ProjectRows,
  WorkflowList,
  activeWorkflow,
  emptyToNull,
  errorMessage,
  repoName
} from "./shared";

type HomeData = {
  projects: OrchestratorProject[];
  workflows: OrchestratorWorkflowSummary[];
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
                <Button variant="outline" asChild>
                  <Link to="/orchestrator/projects">
                    <Github className="size-4" />
                    Projects
                  </Link>
                </Button>
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
