package application

import (
	"strings"
	"unicode"
)

func FeatureIDFromTitle(title string) string {
	var builder strings.Builder
	lastDash := false

	for _, char := range strings.ToLower(strings.TrimSpace(title)) {
		switch {
		case unicode.IsLetter(char) || unicode.IsDigit(char):
			builder.WriteRune(char)
			lastDash = false
		case char == '-' || char == '_' || unicode.IsSpace(char):
			if builder.Len() > 0 && !lastDash {
				builder.WriteByte('-')
				lastDash = true
			}
		}
	}

	result := strings.Trim(builder.String(), "-")
	if result == "" {
		return "feature"
	}
	if len(result) > 80 {
		result = strings.TrimRight(result[:80], "-")
	}
	return result
}
