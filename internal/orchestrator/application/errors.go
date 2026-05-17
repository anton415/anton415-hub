package application

import "errors"

var (
	ErrNotFound          = errors.New("orchestrator resource was not found")
	ErrInvalidInput      = errors.New("orchestrator input is invalid")
	ErrInvalidTransition = errors.New("orchestrator transition is invalid")
)
