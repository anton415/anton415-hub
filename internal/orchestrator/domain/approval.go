package domain

import "time"

type ApprovalDecision string

const (
	ApprovalDecisionApproved         ApprovalDecision = "approved"
	ApprovalDecisionChangesRequested ApprovalDecision = "changes_requested"
	ApprovalDecisionRejected         ApprovalDecision = "rejected"
	ApprovalDecisionApprovedAnyway   ApprovalDecision = "approved_anyway"
)

func (decision ApprovalDecision) Valid() bool {
	switch decision {
	case ApprovalDecisionApproved,
		ApprovalDecisionChangesRequested,
		ApprovalDecisionRejected,
		ApprovalDecisionApprovedAnyway:
		return true
	default:
		return false
	}
}

type Approval struct {
	ID         string
	WorkflowID string
	StepKey    StepKey
	Decision   ApprovalDecision
	Comment    *string
	DecidedBy  string
	DecidedAt  time.Time
}

func NewApproval(workflowID string, stepKey StepKey, decision ApprovalDecision, comment *string, decidedBy string, now time.Time) (Approval, error) {
	if !stepKey.Valid() || !decision.Valid() {
		return Approval{}, ErrInvalidApprovalDecision
	}
	decidedBy, err := normalizeRequiredText(decidedBy, ErrInvalidApprovalDecision)
	if err != nil {
		return Approval{}, err
	}
	return Approval{
		WorkflowID: workflowID,
		StepKey:    stepKey,
		Decision:   decision,
		Comment:    normalizeOptionalText(comment),
		DecidedBy:  decidedBy,
		DecidedAt:  now,
	}, nil
}
