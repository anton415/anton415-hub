package n8n

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/anton415/anton415-hub/internal/orchestrator/application"
)

func TestClientIncludesWebhookErrorBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, `{"message":"access to env vars denied"}`, http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewClient(Config{FeatureIntakeURL: server.URL})

	err := client.StartFeatureWorkflow(context.Background(), application.FeatureIntakePayload{})
	if err == nil {
		t.Fatal("StartFeatureWorkflow returned nil, want error")
	}

	message := err.Error()
	if !strings.Contains(message, "n8n webhook returned 500 Internal Server Error") {
		t.Fatalf("error = %q, want status", message)
	}
	if !strings.Contains(message, "access to env vars denied") {
		t.Fatalf("error = %q, want response body", message)
	}
}
