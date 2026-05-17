package domain

import "errors"

var (
	ErrInvalidProjectName      = errors.New("orchestrator project name is invalid")
	ErrInvalidRepository       = errors.New("orchestrator repository is invalid")
	ErrInvalidProjectStatus    = errors.New("orchestrator project status is invalid")
	ErrInvalidWorkflowTitle    = errors.New("orchestrator workflow title is invalid")
	ErrInvalidWorkflowProblem  = errors.New("orchestrator workflow problem is invalid")
	ErrInvalidWorkflowStatus   = errors.New("orchestrator workflow status is invalid")
	ErrDuplicateWorkflow       = errors.New("orchestrator workflow already exists")
	ErrInvalidStep             = errors.New("orchestrator step is invalid")
	ErrInvalidArtifact         = errors.New("orchestrator artifact is invalid")
	ErrInvalidApprovalDecision = errors.New("orchestrator approval decision is invalid")
	ErrInvalidEvent            = errors.New("orchestrator event is invalid")
	ErrInvalidURL              = errors.New("orchestrator url is invalid")
)
