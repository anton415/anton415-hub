package domain

import (
	"net/url"
	"strings"
	"unicode"
)

const DefaultConfigPath = ".ai/orchestrator.yaml"

func normalizeRequiredText(value string, invalid error) (string, error) {
	normalized := strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
	if normalized == "" {
		return "", invalid
	}
	return normalized, nil
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}
	normalized := strings.Join(strings.Fields(strings.TrimSpace(*value)), " ")
	if normalized == "" {
		return nil
	}
	return &normalized
}

func normalizeCode(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func normalizeRepoName(value string) string {
	return strings.TrimSpace(value)
}

func validRepositoryOwner(owner string) bool {
	if owner == "" {
		return false
	}
	for _, char := range owner {
		if unicode.IsLetter(char) || unicode.IsDigit(char) || char == '-' {
			continue
		}
		return false
	}
	return true
}

func validRepositoryName(repo string) bool {
	if repo == "" {
		return false
	}
	for _, char := range repo {
		if unicode.IsLetter(char) || unicode.IsDigit(char) || char == '-' || char == '_' || char == '.' {
			continue
		}
		return false
	}
	return true
}

func normalizeOptionalURL(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil, ErrInvalidURL
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, ErrInvalidURL
	}
	return &trimmed, nil
}
