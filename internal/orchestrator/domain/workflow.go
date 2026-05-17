package domain

import "time"

type WorkflowStatus string

const (
	WorkflowStatusDraft                        WorkflowStatus = "draft"
	WorkflowStatusSystemAnalysisRunning        WorkflowStatus = "system_analysis_running"
	WorkflowStatusSpecReview                   WorkflowStatus = "spec_review"
	WorkflowStatusSpecApproved                 WorkflowStatus = "spec_approved"
	WorkflowStatusSpecChangesRequested         WorkflowStatus = "spec_changes_requested"
	WorkflowStatusArchitectureRunning          WorkflowStatus = "architecture_running"
	WorkflowStatusArchitectureReview           WorkflowStatus = "architecture_review"
	WorkflowStatusArchitectureApproved         WorkflowStatus = "architecture_approved"
	WorkflowStatusArchitectureChangesRequested WorkflowStatus = "architecture_changes_requested"
	WorkflowStatusReadyForImplementation       WorkflowStatus = "ready_for_implementation"
	WorkflowStatusImplementationRunning        WorkflowStatus = "implementation_running"
	WorkflowStatusPRReview                     WorkflowStatus = "pr_review"
	WorkflowStatusDone                         WorkflowStatus = "done"
	WorkflowStatusFailed                       WorkflowStatus = "failed"
	WorkflowStatusRejected                     WorkflowStatus = "rejected"
)

func (status WorkflowStatus) Valid() bool {
	switch status {
	case WorkflowStatusDraft,
		WorkflowStatusSystemAnalysisRunning,
		WorkflowStatusSpecReview,
		WorkflowStatusSpecApproved,
		WorkflowStatusSpecChangesRequested,
		WorkflowStatusArchitectureRunning,
		WorkflowStatusArchitectureReview,
		WorkflowStatusArchitectureApproved,
		WorkflowStatusArchitectureChangesRequested,
		WorkflowStatusReadyForImplementation,
		WorkflowStatusImplementationRunning,
		WorkflowStatusPRReview,
		WorkflowStatusDone,
		WorkflowStatusFailed,
		WorkflowStatusRejected:
		return true
	default:
		return false
	}
}

type Workflow struct {
	ID             string
	ProjectID      string
	FeatureID      string
	Title          string
	Module         *string
	Problem        string
	Status         WorkflowStatus
	GitHubIssueURL *string
	GitHubPRURL    *string
	N8NExecutionID *string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type WorkflowLinks struct {
	GitHubIssueURL *string
	GitHubPRURL    *string
	N8NExecutionID *string
}

func NewWorkflow(projectID string, featureID string, title string, module *string, problem string, now time.Time) (Workflow, error) {
	title, err := normalizeRequiredText(title, ErrInvalidWorkflowTitle)
	if err != nil {
		return Workflow{}, err
	}
	problem, err = normalizeRequiredText(problem, ErrInvalidWorkflowProblem)
	if err != nil {
		return Workflow{}, err
	}
	featureID, err = normalizeRequiredText(featureID, ErrInvalidWorkflowTitle)
	if err != nil {
		return Workflow{}, err
	}

	return Workflow{
		ProjectID: projectID,
		FeatureID: featureID,
		Title:     title,
		Module:    normalizeOptionalText(module),
		Problem:   problem,
		Status:    WorkflowStatusSystemAnalysisRunning,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

func (workflow Workflow) WithStatus(status WorkflowStatus, now time.Time) (Workflow, error) {
	if !status.Valid() {
		return Workflow{}, ErrInvalidWorkflowStatus
	}
	workflow.Status = status
	workflow.UpdatedAt = now
	return workflow, nil
}

func (workflow Workflow) WithLinks(githubIssueURL *string, githubPRURL *string, n8nExecutionID *string, now time.Time) (Workflow, error) {
	links, err := NormalizeWorkflowLinks(githubIssueURL, githubPRURL, n8nExecutionID)
	if err != nil {
		return Workflow{}, err
	}
	workflow.GitHubIssueURL = links.GitHubIssueURL
	workflow.GitHubPRURL = links.GitHubPRURL
	workflow.N8NExecutionID = links.N8NExecutionID
	workflow.UpdatedAt = now
	return workflow, nil
}

func NormalizeWorkflowLinks(githubIssueURL *string, githubPRURL *string, n8nExecutionID *string) (WorkflowLinks, error) {
	issueURL, err := normalizeOptionalURL(githubIssueURL)
	if err != nil {
		return WorkflowLinks{}, err
	}
	prURL, err := normalizeOptionalURL(githubPRURL)
	if err != nil {
		return WorkflowLinks{}, err
	}
	return WorkflowLinks{
		GitHubIssueURL: issueURL,
		GitHubPRURL:    prURL,
		N8NExecutionID: normalizeOptionalText(n8nExecutionID),
	}, nil
}
