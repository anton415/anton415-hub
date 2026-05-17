export type HealthPayload = {
  service: string;
  status: "ok" | "degraded" | string;
  version: string;
  checks: Record<string, { status: string; latency?: string; error?: string }>;
};

export type HealthState =
  | { kind: "loading" }
  | { kind: "online"; payload: HealthPayload }
  | { kind: "offline"; message: string };

export type AuthProvider = {
  id: string;
  name: string;
  kind: "oauth" | "email" | string;
};

export type AuthUser = {
  email: string;
  provider: string;
};

export type AuthState =
  | { kind: "loading"; providers: AuthProvider[] }
  | { kind: "unauthenticated"; providers: AuthProvider[]; message?: string; emailSent?: boolean }
  | { kind: "authenticated"; providers: AuthProvider[]; user: AuthUser };

export type ProductModule = {
  name: string;
  path: string;
  summary: string;
  state?: string;
};

export type AppPath = "/" | "/todo" | "/finance/expenses" | "/finance/income" | "/finance/settings";

export const financeExpenseCategoryCodes = [
  "restaurants",
  "groceries",
  "personal",
  "utilities",
  "transport",
  "gifts",
  "investments",
  "entertainment",
  "education"
] as const;

export type FinanceExpenseCategoryCode = (typeof financeExpenseCategoryCodes)[number];
export type FinanceCategoryClassification = "expense" | "transfer";
export type FinanceExpenseLimitPeriod = "monthly" | "annual";
export type FinanceExpenseLimitKind = "limit" | "investment_goal";

export type FinanceExpenseCategory = {
  code: FinanceExpenseCategoryCode;
  label: string;
  classification: FinanceCategoryClassification;
  limit_period?: FinanceExpenseLimitPeriod;
  limit_kind?: FinanceExpenseLimitKind;
};

export type FinanceExpenseCategoryAmounts = Record<FinanceExpenseCategoryCode, string>;
export type FinanceExpenseCategoryPercents = Record<FinanceExpenseCategoryCode, string>;

export type FinanceExpenseMonth = {
  month: number;
  category_amounts: FinanceExpenseCategoryAmounts;
  total_amount: string;
  spending_total_amount: string;
};

export type FinanceExpensesYear = {
  year: number;
  currency: "RUB" | string;
  categories: FinanceExpenseCategory[];
  months: FinanceExpenseMonth[];
  annual_totals_by_category: FinanceExpenseCategoryAmounts;
  annual_total_amount: string;
  annual_spending_total_amount: string;
};

export type FinanceIncomeMonth = {
  month: number;
  salary_amount: string;
  bonus_percent: string;
  total_amount: string;
};

export type FinanceIncomeYear = {
  year: number;
  currency: "RUB" | string;
  months: FinanceIncomeMonth[];
  annual_total_amount: string;
  average_monthly_total_amount: string;
};

export type FinanceSettings = {
  currency?: "RUB" | string;
  salary_amount?: string;
  bonus_percent?: string;
  expense_limit_percents: Partial<FinanceExpenseCategoryPercents>;
};

export type FinanceState = {
  loading: boolean;
  saving: boolean;
  year: number;
  settings: FinanceSettings;
  expenses?: FinanceExpensesYear;
  income?: FinanceIncomeYear;
  error?: string;
  formError?: string;
};

export type TodoTaskStatus = "todo" | "in_progress" | "done";
export type TodoView = "inbox" | "today" | "overdue" | "upcoming" | "scheduled" | "flagged" | "all" | "completed";
export type TodoServerView = Exclude<TodoView, "all" | "completed">;
export type TodoTaskPriority = "none" | "low" | "medium" | "high";
export type TodoRepeatFrequency = "none" | "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "yearly";
export type TodoSort = "smart" | "due" | "created" | "title" | "priority";
export type TodoSortDirection = "asc" | "desc";

export type TodoProject = {
  id: number;
  parent_project_id: number | null;
  name: string;
  start_date: string | null;
  end_date: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type TodoTask = {
  id: number;
  project_id: number | null;
  parent_task_id: number | null;
  title: string;
  notes: string | null;
  url: string | null;
  status: TodoTaskStatus;
  due_date: string | null;
  due_time: string | null;
  repeat_frequency: TodoRepeatFrequency;
  repeat_interval: number;
  repeat_until: string | null;
  flagged: boolean;
  priority: TodoTaskPriority;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type TodoScope =
  | { kind: "view"; view: TodoView }
  | { kind: "project"; projectId: number };

export type TodoState = {
  loading: boolean;
  saving: boolean;
  error?: string;
  projects: TodoProject[];
  tasks: TodoTask[];
  scope: TodoScope;
  editingTaskId?: number;
  editingProjectId?: number;
  todoPanelCollapsed?: boolean;
  searchPanelCollapsed?: boolean;
  showArchivedProjects?: boolean;
  sort: TodoSort;
  direction: TodoSortDirection;
  search: string;
  taskFormError?: string;
  projectFormError?: string;
};

export type HomeState = {
  loading: boolean;
  year: number;
  settings: FinanceSettings;
  projects: TodoProject[];
  todayTasks: TodoTask[];
  overdueTasks: TodoTask[];
  flaggedTasks: TodoTask[];
  expenses?: FinanceExpensesYear;
  income?: FinanceIncomeYear;
  error?: string;
};

export type TodoTaskPayload = {
  project_id: number | null;
  parent_task_id: number | null;
  title: string;
  notes: string | null;
  url: string | null;
  status?: TodoTaskStatus;
  due_date: string | null;
  due_time: string | null;
  repeat_frequency: TodoRepeatFrequency;
  repeat_interval: number;
  repeat_until: string | null;
  flagged: boolean;
  priority: TodoTaskPriority;
};

export type TodoProjectPayload = {
  parent_project_id: number | null;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export type TodoProjectQuery = {
  include_archived?: boolean;
  archived?: boolean;
};

export type TodoTaskQuery = {
  view?: TodoServerView;
  status?: TodoTaskStatus;
  project_id?: number;
  sort?: TodoSort;
  direction?: TodoSortDirection;
  q?: string;
};

export type OrchestratorProjectStatus = "active" | "archived";

export type OrchestratorWorkflowStatus =
  | "draft"
  | "system_analysis_running"
  | "spec_review"
  | "spec_approved"
  | "spec_changes_requested"
  | "architecture_running"
  | "architecture_review"
  | "architecture_approved"
  | "architecture_changes_requested"
  | "ready_for_implementation"
  | "implementation_running"
  | "pr_review"
  | "done"
  | "failed"
  | "rejected";

export type OrchestratorStepStatus = "pending" | "running" | "done" | "failed" | "skipped";

export type OrchestratorProject = {
  id: string;
  name: string;
  github_owner: string;
  github_repo: string;
  default_branch: string;
  config_path: string;
  status: OrchestratorProjectStatus;
  created_at: string;
  updated_at: string;
};

export type OrchestratorWorkflow = {
  id: string;
  project_id: string;
  feature_id: string;
  title: string;
  module: string | null;
  problem: string;
  status: OrchestratorWorkflowStatus;
  github_issue_url: string | null;
  github_pr_url: string | null;
  n8n_execution_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrchestratorWorkflowSummary = {
  workflow: OrchestratorWorkflow;
  project: OrchestratorProject;
  step_count: number;
  artifact_count: number;
  approval_count: number;
  event_count: number;
};

export type OrchestratorStep = {
  id: string;
  workflow_id: string;
  step_key: string;
  title: string;
  agent: string | null;
  status: OrchestratorStepStatus;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
};

export type OrchestratorArtifact = {
  id: string;
  workflow_id: string;
  artifact_type: string;
  title: string;
  github_url: string | null;
  local_preview: string | null;
  created_by_agent: string | null;
  created_at: string;
};

export type OrchestratorApproval = {
  id: string;
  workflow_id: string;
  step_key: string;
  decision: string;
  comment: string | null;
  decided_by: string;
  decided_at: string;
};

export type OrchestratorEvent = {
  id: string;
  workflow_id: string;
  source: string;
  event_type: string;
  message: string;
  payload_json: unknown;
  created_at: string;
};

export type OrchestratorWorkflowDetail = {
  workflow: OrchestratorWorkflow;
  project: OrchestratorProject;
  steps: OrchestratorStep[];
  artifacts: OrchestratorArtifact[];
  approvals: OrchestratorApproval[];
  events: OrchestratorEvent[];
};

export type OrchestratorProjectPayload = {
  name: string;
  github_owner: string;
  github_repo: string;
  default_branch: string;
  status?: OrchestratorProjectStatus;
};

export type OrchestratorWorkflowPayload = {
  project_id: string;
  title: string;
  module: string | null;
  problem: string;
};
