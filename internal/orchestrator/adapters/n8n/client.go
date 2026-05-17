package n8n

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/anton415/anton415-hub/internal/orchestrator/application"
)

var ErrWebhookNotConfigured = errors.New("n8n webhook is not configured")

type Config struct {
	FeatureIntakeURL string
	ApprovalURL      string
	AuthToken        string
	HTTPClient       *http.Client
}

type Client struct {
	featureIntakeURL string
	approvalURL      string
	authToken        string
	httpClient       *http.Client
}

func NewClient(cfg Config) *Client {
	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &Client{
		featureIntakeURL: strings.TrimSpace(cfg.FeatureIntakeURL),
		approvalURL:      strings.TrimSpace(cfg.ApprovalURL),
		authToken:        strings.TrimSpace(cfg.AuthToken),
		httpClient:       httpClient,
	}
}

func (client *Client) StartFeatureWorkflow(ctx context.Context, payload application.FeatureIntakePayload) error {
	return client.postJSON(ctx, client.featureIntakeURL, payload)
}

func (client *Client) NotifyApproval(ctx context.Context, payload application.ApprovalPayload) error {
	return client.postJSON(ctx, client.approvalURL, payload)
}

func (client *Client) postJSON(ctx context.Context, targetURL string, payload any) error {
	if targetURL == "" {
		return ErrWebhookNotConfigured
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	if client.authToken != "" {
		request.Header.Set("Authorization", "Bearer "+client.authToken)
	}

	response, err := client.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 1024))
		message := strings.TrimSpace(string(responseBody))
		if message == "" {
			return fmt.Errorf("n8n webhook returned %s", response.Status)
		}
		return fmt.Errorf("n8n webhook returned %s: %s", response.Status, message)
	}
	return nil
}
