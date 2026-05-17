package domain

import "time"

type ArtifactType string

const (
	ArtifactTypeSpec               ArtifactType = "spec"
	ArtifactTypeSpecReview         ArtifactType = "spec_review"
	ArtifactTypeArchitecture       ArtifactType = "architecture"
	ArtifactTypeArchitectureReview ArtifactType = "architecture_review"
	ArtifactTypeCodexPrompt        ArtifactType = "codex_prompt"
	ArtifactTypePRReview           ArtifactType = "pr_review"
	ArtifactTypeDecisionLog        ArtifactType = "decision_log"
)

func (artifactType ArtifactType) Valid() bool {
	switch artifactType {
	case ArtifactTypeSpec,
		ArtifactTypeSpecReview,
		ArtifactTypeArchitecture,
		ArtifactTypeArchitectureReview,
		ArtifactTypeCodexPrompt,
		ArtifactTypePRReview,
		ArtifactTypeDecisionLog:
		return true
	default:
		return false
	}
}

type Artifact struct {
	ID             string
	WorkflowID     string
	ArtifactType   ArtifactType
	Title          string
	GitHubURL      *string
	LocalPreview   *string
	CreatedByAgent *Agent
	CreatedAt      time.Time
}

func NewArtifact(workflowID string, artifactType ArtifactType, title string, githubURL *string, localPreview *string, createdByAgent *Agent, now time.Time) (Artifact, error) {
	if !artifactType.Valid() {
		return Artifact{}, ErrInvalidArtifact
	}
	title, err := normalizeRequiredText(title, ErrInvalidArtifact)
	if err != nil {
		return Artifact{}, err
	}
	githubURL, err = normalizeOptionalURL(githubURL)
	if err != nil {
		return Artifact{}, err
	}

	return Artifact{
		WorkflowID:     workflowID,
		ArtifactType:   artifactType,
		Title:          title,
		GitHubURL:      githubURL,
		LocalPreview:   normalizeOptionalText(localPreview),
		CreatedByAgent: createdByAgent,
		CreatedAt:      now,
	}, nil
}
