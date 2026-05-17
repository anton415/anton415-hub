package domain

import (
	"strings"
	"time"
)

type ProjectStatus string

const (
	ProjectStatusActive   ProjectStatus = "active"
	ProjectStatusArchived ProjectStatus = "archived"
)

func (status ProjectStatus) Valid() bool {
	switch status {
	case ProjectStatusActive, ProjectStatusArchived:
		return true
	default:
		return false
	}
}

type Project struct {
	ID            string
	Name          string
	GitHubOwner   string
	GitHubRepo    string
	DefaultBranch string
	ConfigPath    string
	Status        ProjectStatus
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func NewProject(name string, githubOwner string, githubRepo string, defaultBranch string, now time.Time) (Project, error) {
	name, err := normalizeRequiredText(name, ErrInvalidProjectName)
	if err != nil {
		return Project{}, err
	}

	githubOwner = normalizeCode(githubOwner)
	githubRepo = normalizeRepoName(githubRepo)
	if !validRepositoryOwner(githubOwner) || !validRepositoryName(githubRepo) {
		return Project{}, ErrInvalidRepository
	}

	defaultBranch = strings.TrimSpace(defaultBranch)
	if defaultBranch == "" {
		defaultBranch = "main"
	}

	return Project{
		Name:          name,
		GitHubOwner:   githubOwner,
		GitHubRepo:    githubRepo,
		DefaultBranch: defaultBranch,
		ConfigPath:    DefaultConfigPath,
		Status:        ProjectStatusActive,
		CreatedAt:     now,
		UpdatedAt:     now,
	}, nil
}

func UpdateProject(project Project, name string, githubOwner string, githubRepo string, defaultBranch string, status ProjectStatus, now time.Time) (Project, error) {
	name, err := normalizeRequiredText(name, ErrInvalidProjectName)
	if err != nil {
		return Project{}, err
	}

	githubOwner = normalizeCode(githubOwner)
	githubRepo = normalizeRepoName(githubRepo)
	if !validRepositoryOwner(githubOwner) || !validRepositoryName(githubRepo) {
		return Project{}, ErrInvalidRepository
	}

	defaultBranch = strings.TrimSpace(defaultBranch)
	if defaultBranch == "" {
		defaultBranch = "main"
	}
	if status == "" {
		status = ProjectStatusActive
	}
	if !status.Valid() {
		return Project{}, ErrInvalidProjectStatus
	}

	project.Name = name
	project.GitHubOwner = githubOwner
	project.GitHubRepo = githubRepo
	project.DefaultBranch = defaultBranch
	project.Status = status
	project.UpdatedAt = now
	return project, nil
}
