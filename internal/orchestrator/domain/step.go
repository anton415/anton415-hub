package domain

import "time"

type StepKey string

const (
	StepKeyIdeaCreated            StepKey = "idea_created"
	StepKeySystemAnalysis         StepKey = "system_analysis"
	StepKeySpecApproval           StepKey = "spec_approval"
	StepKeyArchitecture           StepKey = "architecture"
	StepKeyArchitectureApproval   StepKey = "architecture_approval"
	StepKeyCodexPromptGenerated   StepKey = "codex_prompt_generated"
	StepKeyReadyForImplementation StepKey = "ready_for_implementation"
	StepKeyPROpened               StepKey = "pr_opened"
	StepKeyPRReview               StepKey = "pr_review"
	StepKeyDone                   StepKey = "done"
)

func (key StepKey) Valid() bool {
	switch key {
	case StepKeyIdeaCreated,
		StepKeySystemAnalysis,
		StepKeySpecApproval,
		StepKeyArchitecture,
		StepKeyArchitectureApproval,
		StepKeyCodexPromptGenerated,
		StepKeyReadyForImplementation,
		StepKeyPROpened,
		StepKeyPRReview,
		StepKeyDone:
		return true
	default:
		return false
	}
}

type StepStatus string

const (
	StepStatusPending StepStatus = "pending"
	StepStatusRunning StepStatus = "running"
	StepStatusDone    StepStatus = "done"
	StepStatusFailed  StepStatus = "failed"
	StepStatusSkipped StepStatus = "skipped"
)

func (status StepStatus) Valid() bool {
	switch status {
	case StepStatusPending, StepStatusRunning, StepStatusDone, StepStatusFailed, StepStatusSkipped:
		return true
	default:
		return false
	}
}

type Agent string

const (
	AgentAnton   Agent = "anton"
	AgentChatGPT Agent = "chatgpt"
	AgentClaude  Agent = "claude"
	AgentCodex   Agent = "codex"
	AgentN8N     Agent = "n8n"
	AgentGitHub  Agent = "github"
	AgentSystem  Agent = "system"
)

type Step struct {
	ID           string
	WorkflowID   string
	StepKey      StepKey
	Title        string
	Agent        *Agent
	Status       StepStatus
	StartedAt    *time.Time
	FinishedAt   *time.Time
	ErrorMessage *string
}

func NewStep(workflowID string, stepKey StepKey, title string, agent *Agent, status StepStatus, now time.Time) (Step, error) {
	if !stepKey.Valid() || !status.Valid() {
		return Step{}, ErrInvalidStep
	}
	title, err := normalizeRequiredText(title, ErrInvalidStep)
	if err != nil {
		return Step{}, err
	}

	var startedAt *time.Time
	var finishedAt *time.Time
	if status == StepStatusRunning || status == StepStatusDone || status == StepStatusFailed {
		startedAt = &now
	}
	if status == StepStatusDone || status == StepStatusFailed || status == StepStatusSkipped {
		finishedAt = &now
	}

	return Step{
		WorkflowID: workflowID,
		StepKey:    stepKey,
		Title:      title,
		Agent:      agent,
		Status:     status,
		StartedAt:  startedAt,
		FinishedAt: finishedAt,
	}, nil
}

func DefaultSteps(workflowID string, now time.Time) ([]Step, error) {
	anton := AgentAnton
	chatgpt := AgentChatGPT
	claude := AgentClaude
	codex := AgentCodex

	definitions := []struct {
		key    StepKey
		title  string
		agent  *Agent
		status StepStatus
	}{
		{StepKeyIdeaCreated, "Idea created", &anton, StepStatusDone},
		{StepKeySystemAnalysis, "ChatGPT system analysis", &chatgpt, StepStatusRunning},
		{StepKeySpecApproval, "Spec approval", &anton, StepStatusPending},
		{StepKeyArchitecture, "Claude architecture", &claude, StepStatusPending},
		{StepKeyArchitectureApproval, "Architecture approval", &anton, StepStatusPending},
		{StepKeyCodexPromptGenerated, "Codex prompt", &codex, StepStatusPending},
		{StepKeyReadyForImplementation, "Ready for implementation", nil, StepStatusPending},
	}

	steps := make([]Step, 0, len(definitions))
	for _, definition := range definitions {
		step, err := NewStep(workflowID, definition.key, definition.title, definition.agent, definition.status, now)
		if err != nil {
			return nil, err
		}
		steps = append(steps, step)
	}
	return steps, nil
}
