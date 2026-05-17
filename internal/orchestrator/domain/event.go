package domain

import (
	"encoding/json"
	"time"
)

type EventSource string

const (
	EventSourceAnton  EventSource = "anton"
	EventSourceN8N    EventSource = "n8n"
	EventSourceGitHub EventSource = "github"
	EventSourceSystem EventSource = "system"
)

func (source EventSource) Valid() bool {
	switch source {
	case EventSourceAnton, EventSourceN8N, EventSourceGitHub, EventSourceSystem:
		return true
	default:
		return false
	}
}

type Event struct {
	ID          string
	WorkflowID  string
	Source      EventSource
	EventType   string
	Message     string
	PayloadJSON json.RawMessage
	CreatedAt   time.Time
}

func NewEvent(workflowID string, source EventSource, eventType string, message string, payloadJSON json.RawMessage, now time.Time) (Event, error) {
	if !source.Valid() {
		return Event{}, ErrInvalidEvent
	}
	eventType, err := normalizeRequiredText(eventType, ErrInvalidEvent)
	if err != nil {
		return Event{}, err
	}
	message, err = normalizeRequiredText(message, ErrInvalidEvent)
	if err != nil {
		return Event{}, err
	}
	if len(payloadJSON) > 0 && !json.Valid(payloadJSON) {
		return Event{}, ErrInvalidEvent
	}

	return Event{
		WorkflowID:  workflowID,
		Source:      source,
		EventType:   eventType,
		Message:     message,
		PayloadJSON: payloadJSON,
		CreatedAt:   now,
	}, nil
}
