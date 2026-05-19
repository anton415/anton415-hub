import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Check, GitBranch, ListChecks, RefreshCw, ShieldCheck, X } from "lucide-react";
import { orchestratorApi } from "../../api";
import type { OrchestratorWorkflowDetail } from "../../api/types";
import { useAuthGate } from "../../hooks/useAuthGate";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  type LoadState,
  ArtifactRows,
  ErrorPanel,
  EventRows,
  ExternalAnchor,
  InfoCell,
  LoadingScreen,
  OrchestratorFrame,
  StatusBadge,
  StepIcon,
  emptyToNull,
  errorMessage,
  formatDate,
  repoName
} from "./shared";

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
                    onClick={() => runAction("approve-spec", orchestratorApi.approveSpec)}
                  >
                    <ShieldCheck className="size-4" />
                    Approve Spec
                  </Button>
                  <Button
                    variant="outline"
                    disabled={Boolean(savingAction)}
                    onClick={() => runAction("request-spec", orchestratorApi.requestSpecChanges)}
                  >
                    <ListChecks className="size-4" />
                    Request Spec Changes
                  </Button>
                  <Button
                    variant="outline"
                    disabled={Boolean(savingAction)}
                    onClick={() => runAction("approve-architecture", orchestratorApi.approveArchitecture)}
                  >
                    <Check className="size-4" />
                    Approve Architecture
                  </Button>
                  <Button
                    variant="outline"
                    disabled={Boolean(savingAction)}
                    onClick={() => runAction("request-architecture", orchestratorApi.requestArchitectureChanges)}
                  >
                    <GitBranch className="size-4" />
                    Request Architecture Changes
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={Boolean(savingAction)}
                    onClick={() => runAction("reject", orchestratorApi.reject)}
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
