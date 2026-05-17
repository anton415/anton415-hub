import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Github } from "lucide-react";
import { orchestratorApi } from "../../api";
import type { OrchestratorProject } from "../../api/types";
import { useAuthGate } from "../../hooks/useAuthGate";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  type LoadState,
  ErrorPanel,
  Field,
  LoadingScreen,
  OrchestratorFrame,
  ProjectRows,
  errorMessage
} from "./shared";

const initialProjectForm = {
  name: "Anton415 Hub",
  github_owner: "anton415",
  github_repo: "anton415-hub",
  default_branch: "main"
};

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
