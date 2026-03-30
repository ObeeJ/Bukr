package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	AccessTokenTTL  = 15 * time.Minute
	RefreshTokenTTL = 7 * 24 * time.Hour
	AdminTokenTTL   = 10 * time.Minute
)

// BukrClaims is the JWT payload for both user and admin tokens.
// The `adm` field distinguishes admin tokens — a user token with adm=false
// cannot pass admin middleware even if the secret were somehow shared.
type BukrClaims struct {
	UserID   string `json:"sub"`
	Email    string `json:"email"`
	UserType string `json:"user_type"`
	JTI      string `json:"jti"`      // unique token ID for blacklisting
	FP       string `json:"fp"`       // device fingerprint
	IsAdmin  bool   `json:"adm"`
	jwt.RegisteredClaims
}

// IssueAccessToken signs a 15-minute JWT with the app secret.
func IssueAccessToken(secret, userID, email, userType, fp string) (string, string, error) {
	jti := newHex(16)
	claims := BukrClaims{
		UserID:   userID,
		Email:    email,
		UserType: userType,
		JTI:      jti,
		FP:       fp,
		IsAdmin:  false,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	return signed, jti, err
}

// IssueAdminAccessToken signs a 10-minute JWT with the admin secret.
func IssueAdminAccessToken(secret, adminID, email string) (string, string, error) {
	jti := newHex(16)
	claims := BukrClaims{
		UserID:   adminID,
		Email:    email,
		UserType: "admin",
		JTI:      jti,
		IsAdmin:  true,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(AdminTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	return signed, jti, err
}

// ParseToken validates a JWT and returns its claims.
// It rejects tokens signed with the wrong algorithm (alg confusion attack prevention).
func ParseToken(secret, tokenStr string) (*BukrClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &BukrClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(*BukrClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	return claims, nil
}

// NewRefreshToken generates a cryptographically random 64-byte hex refresh token.
// The raw value is sent to the client; only its SHA256 hash is stored in the DB.
func NewRefreshToken() (raw, hash string, err error) {
	b := make([]byte, 64)
	if _, err = rand.Read(b); err != nil {
		return
	}
	raw = hex.EncodeToString(b)
	hash = HashToken(raw)
	return
}

// HashToken returns the SHA256 hex digest of a token string.
// Used for storing refresh tokens and OTPs without keeping the plaintext.
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// Fingerprint derives a device fingerprint from the User-Agent and the first
// two octets of the IP address. This is intentionally coarse so that mobile
// users on changing IPs are not logged out, while tokens stolen to a
// completely different device are rejected.
func Fingerprint(userAgent, ip string) string {
	prefix := ipPrefix(ip)
	sum := sha256.Sum256([]byte(userAgent + "|" + prefix))
	return hex.EncodeToString(sum[:16]) // 32-char hex, enough entropy
}

// newHex returns n random bytes as a hex string.
func newHex(n int) string {
	b := make([]byte, n)
	rand.Read(b) //nolint:errcheck — rand.Read never errors on modern kernels
	return hex.EncodeToString(b)
}

// ipPrefix returns the first two octets of an IPv4 address, or the full
// address for IPv6 (which already has prefix-based allocation).
func ipPrefix(ip string) string {
	count := 0
	for i, c := range ip {
		if c == '.' {
			count++
			if count == 2 {
				return ip[:i]
			}
		}
	}
	return ip
}
