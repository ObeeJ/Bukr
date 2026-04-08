package events

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

// FlierExtractRequest — the frontend sends the public URL of the uploaded flier.
type FlierExtractRequest struct {
	FlierURL string `json:"flier_url"`
}

// FlierExtractResponse — structured fields parsed from the flier image.
type FlierExtractResponse struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Date        string `json:"date"`        // YYYY-MM-DD or empty
	Time        string `json:"time"`        // HH:MM or empty
	Location    string `json:"location"`
	City        string `json:"city"`
	Price       string `json:"price"`       // raw string, frontend parses
	Category    string `json:"category"`
}

// ExtractFlierStatus reports whether AI flier extraction is configured.
// GET /api/v1/events/extract-flier/status  (public — no auth needed)
func (h *Handler) ExtractFlierStatus(c *fiber.Ctx) error {
	return shared.Success(c, fiber.StatusOK, fiber.Map{
		"enabled": os.Getenv("OPENAI_API_KEY") != "",
	})
}

// ExtractFlier calls OpenAI GPT-4o vision to parse event details from a flier image.
// POST /api/v1/events/extract-flier  (organizer auth required)
func (h *Handler) ExtractFlier(c *fiber.Ctx) error {
	var req FlierExtractRequest
	if err := c.BodyParser(&req); err != nil || req.FlierURL == "" {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "flier_url is required")
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return shared.Error(c, fiber.StatusServiceUnavailable, shared.CodeInternalError, "AI extraction not configured")
	}

	extracted, err := callOpenAIVision(apiKey, req.FlierURL)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to extract flier data")
	}

	return shared.Success(c, fiber.StatusOK, extracted)
}

// callOpenAIVision sends the flier image URL to GPT-4o and returns parsed fields.
func callOpenAIVision(apiKey, imageURL string) (*FlierExtractResponse, error) {
	prompt := `You are an event data extractor. Given this event flier image, extract the following fields as JSON:
{"title":"","description":"","date":"YYYY-MM-DD or empty","time":"HH:MM or empty","location":"","city":"","price":"numeric string or empty","category":""}
Return ONLY valid JSON, no markdown, no explanation.`

	body := map[string]any{
		"model": "gpt-4o",
		"messages": []map[string]any{
			{
				"role": "user",
				"content": []map[string]any{
					{"type": "text", "text": prompt},
					{"type": "image_url", "image_url": map[string]string{"url": imageURL, "detail": "low"}},
				},
			},
		},
		"max_tokens": 300,
	}

	payload, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openai returned %d", resp.StatusCode)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	// Strip any accidental markdown fences before unmarshalling
	raw := result.Choices[0].Message.Content
	raw = stripMarkdownFences(raw)

	var extracted FlierExtractResponse
	if err := json.Unmarshal([]byte(raw), &extracted); err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}
	return &extracted, nil
}

// stripMarkdownFences removes ```json ... ``` wrappers that GPT sometimes adds.
func stripMarkdownFences(s string) string {
	b := []byte(s)
	start := bytes.Index(b, []byte("{"))
	end := bytes.LastIndex(b, []byte("}"))
	if start == -1 || end == -1 || end < start {
		return s
	}
	_ = io.Discard // keep import used
	return string(b[start : end+1])
}
