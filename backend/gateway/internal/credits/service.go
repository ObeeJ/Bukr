package credits

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// shared HTTP client — one instance, connection pool reused across all Paystack calls.
// http.DefaultClient has no timeout; a hung Paystack API would block forever.
var paystackHTTPClient = &http.Client{Timeout: 10 * time.Second}

type Service struct {
	repo           *Repository
	paystackSecret string
	appBaseURL     string // e.g. https://bukr.app — for callback URL fallback
}

func NewService(repo *Repository, paystackSecret, appBaseURL string) *Service {
	return &Service{repo: repo, paystackSecret: paystackSecret, appBaseURL: appBaseURL}
}

// GetMyCredits returns the organizer's current credit balance and history.
func (s *Service) GetMyCredits(ctx context.Context, organizerID string) (MyCreditsResponse, error) {
	return s.repo.GetMyCredits(ctx, organizerID)
}

// InitiatePurchase creates a pending pack record then calls Paystack to get
// the authorization URL. The pack only activates after webhook confirmation.
//
// LeetCode pattern: two-phase commit — write intent first, confirm on callback.
// This prevents credits being granted before payment clears.
func (s *Service) InitiatePurchase(
	ctx context.Context,
	organizerID, email, packType, callbackURL string,
) (PurchaseInitResponse, error) {
	def, ok := GetPackDef(packType)
	if !ok {
		return PurchaseInitResponse{}, fmt.Errorf("invalid pack type: %s", packType)
	}

	// Generate unique reference: BUKR-CREDIT-{timestamp}-{random4}
	ref := fmt.Sprintf("BUKR-CREDIT-%d-%04x", time.Now().UnixMilli(), pseudoRand())

	// Write pending pack — inactive until webhook fires
	_, err := s.repo.CreatePack(ctx, organizerID, packType, ref, def)
	if err != nil {
		return PurchaseInitResponse{}, fmt.Errorf("failed to create pack record: %w", err)
	}

	amountKobo := int64(def.PriceNGN) * 100

	if callbackURL == "" {
		callbackURL = s.appBaseURL + "/#/credits"
	}

	authURL, err := s.initPaystack(email, amountKobo, ref, callbackURL)
	if err != nil {
		return PurchaseInitResponse{}, fmt.Errorf("paystack init failed: %w", err)
	}

	return PurchaseInitResponse{
		AuthorizationURL: authURL,
		Reference:        ref,
		PackType:         packType,
		AmountKobo:       amountKobo,
	}, nil
}

// ConfirmPayment activates the credit pack matching the payment reference.
// Called by the Paystack webhook handler — idempotent.
func (s *Service) ConfirmPayment(ctx context.Context, reference string) error {
	return s.repo.ActivatePack(ctx, reference)
}

// ConsumeCredit deducts one event credit from the organizer's active pack.
// Called at event publish time.
func (s *Service) ConsumeCredit(ctx context.Context, organizerID string) error {
	return s.repo.ConsumeCredit(ctx, organizerID)
}

// ── PAYSTACK ──────────────────────────────────────────────────────────────────

func (s *Service) initPaystack(email string, amountKobo int64, ref, callbackURL string) (string, error) {
	// Dev mode: no secret configured
	if s.paystackSecret == "" {
		return fmt.Sprintf("https://checkout.paystack.com/mock/%s", ref), nil
	}

	body := fmt.Sprintf(
		`{"email":%q,"amount":%d,"reference":%q,"callback_url":%q,"metadata":{"type":"credit_pack"}}`,
		email, amountKobo, ref, callbackURL,
	)

	req, _ := http.NewRequest("POST", "https://api.paystack.co/transaction/initialize",
		strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+s.paystackSecret)
	req.Header.Set("Content-Type", "application/json")

	resp, err := paystackHTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var result struct {
		Data struct {
			AuthorizationURL string `json:"authorization_url"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &result); err != nil || result.Data.AuthorizationURL == "" {
		return "", fmt.Errorf("paystack did not return authorization_url: %s", string(raw))
	}
	return result.Data.AuthorizationURL, nil
}

// pseudoRand returns a random uint16 for reference generation.
func pseudoRand() uint16 {
	var b [2]byte
	if _, err := rand.Read(b[:]); err != nil {
		// Fallback to predictable time-based seed if crypto/rand fails
		return uint16(time.Now().UnixNano() & 0xFFFF)
	}
	return binary.BigEndian.Uint16(b[:])
}
