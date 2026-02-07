package shared

import "github.com/gofiber/fiber/v2"

type APIResponse struct {
	Status string      `json:"status"`
	Data   interface{} `json:"data,omitempty"`
	Error  *APIError   `json:"error,omitempty"`
}

type APIError struct {
	Code    string        `json:"code"`
	Message string        `json:"message"`
	Details []FieldError  `json:"details,omitempty"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type PaginationMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

func Success(c *fiber.Ctx, status int, data interface{}) error {
	return c.Status(status).JSON(APIResponse{
		Status: "success",
		Data:   data,
	})
}

func Error(c *fiber.Ctx, status int, code string, message string) error {
	return c.Status(status).JSON(APIResponse{
		Status: "error",
		Error: &APIError{
			Code:    code,
			Message: message,
		},
	})
}

func ValidationError(c *fiber.Ctx, details []FieldError) error {
	return c.Status(fiber.StatusBadRequest).JSON(APIResponse{
		Status: "error",
		Error: &APIError{
			Code:    "VALIDATION_ERROR",
			Message: "Request validation failed",
			Details: details,
		},
	})
}
