/**
 * USE CASE LAYER - Scanner Assignment Business Logic
 * 
 * Scanner Service: Manage scanner assignments for events
 * 
 * Architecture Layer: Service (Layer 3)
 * Dependencies: Repository (database access)
 * Responsibility: Scanner assignment logic, validation
 */

package events

import (
	"context"
	"fmt"
	"time"
)

/**
 * AssignScanner: Assign user as scanner for event
 * 
 * Flow:
 * 1. Find user by email
 * 2. Check if already assigned
 * 3. Create scanner assignment
 * 4. Return assignment details
 */
func (s *Service) AssignScanner(ctx context.Context, eventID, assignedBy, scannerEmail string, expiresAt *string) (*ScannerAssignment, error) {
	// Find user by email
	var scannerUserID, scannerName string
	err := s.repo.db.QueryRow(ctx,
		`SELECT id::text, name FROM users WHERE email = $1`,
		scannerEmail,
	).Scan(&scannerUserID, &scannerName)
	
	if err != nil {
		return nil, fmt.Errorf("user not found with email: %s", scannerEmail)
	}

	// Insert scanner assignment (ON CONFLICT updates is_active)
	var assignment ScannerAssignment
	err = s.repo.db.QueryRow(ctx,
		`INSERT INTO scanner_assignments (event_id, scanner_user_id, assigned_by, expires_at)
		 VALUES ($1, $2, $3, $4::timestamptz)
		 ON CONFLICT (event_id, scanner_user_id) 
		 DO UPDATE SET is_active = true, expires_at = EXCLUDED.expires_at
		 RETURNING id::text, event_id::text, scanner_user_id::text, assigned_by::text, 
		           is_active, created_at, expires_at`,
		eventID, scannerUserID, assignedBy, expiresAt,
	).Scan(
		&assignment.ID, &assignment.EventID, &assignment.ScannerUserID,
		&assignment.AssignedBy, &assignment.IsActive, &assignment.CreatedAt, &assignment.ExpiresAt,
	)

	if err != nil {
		return nil, err
	}

	// Add scanner details
	assignment.ScannerName = scannerName
	assignment.ScannerEmail = scannerEmail

	return &assignment, nil
}

/**
 * ListScanners: Get all scanners for event
 */
func (s *Service) ListScanners(ctx context.Context, eventID string) ([]ScannerAssignment, error) {
	rows, err := s.repo.db.Query(ctx,
		`SELECT sa.id::text, sa.event_id::text, sa.scanner_user_id::text, 
		        u.name, u.email, sa.assigned_by::text, sa.is_active, 
		        sa.created_at, sa.expires_at
		 FROM scanner_assignments sa
		 JOIN users u ON sa.scanner_user_id = u.id
		 WHERE sa.event_id = $1
		 ORDER BY sa.created_at DESC`,
		eventID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scanners []ScannerAssignment
	for rows.Next() {
		var s ScannerAssignment
		err := rows.Scan(
			&s.ID, &s.EventID, &s.ScannerUserID, &s.ScannerName, &s.ScannerEmail,
			&s.AssignedBy, &s.IsActive, &s.CreatedAt, &s.ExpiresAt,
		)
		if err != nil {
			return nil, err
		}
		scanners = append(scanners, s)
	}

	return scanners, nil
}

/**
 * RemoveScanner: Deactivate scanner assignment
 */
func (s *Service) RemoveScanner(ctx context.Context, eventID, scannerID string) error {
	result, err := s.repo.db.Exec(ctx,
		`UPDATE scanner_assignments 
		 SET is_active = false 
		 WHERE event_id = $1 AND scanner_user_id = $2`,
		eventID, scannerID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("scanner assignment not found")
	}
	return nil
}

/**
 * ClaimFreeTicket: Claim free ticket without payment
 * 
 * Flow:
 * 1. Verify event allows free tickets (requires_payment = false)
 * 2. Check ticket availability
 * 3. Generate ticket ID and QR code
 * 4. Create ticket record with is_free = true
 * 5. Decrement available tickets
 */
func (s *Service) ClaimFreeTicket(ctx context.Context, eventID, userID string, quantity int) (*FreeTicketResponse, error) {
	// Start transaction
	tx, err := s.repo.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Verify event allows free tickets and has availability
	var requiresPayment bool
	var availableTickets int
	err = tx.QueryRow(ctx,
		`SELECT requires_payment, available_tickets FROM events WHERE id = $1 AND status = 'active'`,
		eventID,
	).Scan(&requiresPayment, &availableTickets)

	if err != nil {
		return nil, fmt.Errorf("event not found or inactive")
	}

	if requiresPayment {
		return nil, fmt.Errorf("this event requires payment")
	}

	if availableTickets < quantity {
		return nil, fmt.Errorf("insufficient tickets available")
	}

	// Generate ticket ID
	ticketID := fmt.Sprintf("BKR-%d-%s", time.Now().Unix(), eventID[:8])

	// Generate QR code data
	qrData := fmt.Sprintf(`{"ticketId":"%s","eventId":"%s","userId":"%s"}`, ticketID, eventID, userID)

	// Create ticket
	var ticket FreeTicketResponse
	err = tx.QueryRow(ctx,
		`INSERT INTO tickets (ticket_id, event_id, user_id, ticket_type, quantity, 
		                      unit_price, total_price, currency, qr_code_data, is_free, status)
		 VALUES ($1, $2, $3, 'General Admission', $4, 0, 0, 'NGN', $5, true, 'valid')
		 RETURNING ticket_id, event_id::text, user_id::text, quantity, qr_code_data, created_at`,
		ticketID, eventID, userID, quantity, qrData,
	).Scan(&ticket.TicketID, &ticket.EventID, &ticket.UserID, &ticket.Quantity, &ticket.QRCodeData, &ticket.CreatedAt)

	if err != nil {
		return nil, err
	}

	// Decrement available tickets
	_, err = tx.Exec(ctx,
		`UPDATE events SET available_tickets = available_tickets - $1 WHERE id = $2`,
		quantity, eventID,
	)
	if err != nil {
		return nil, err
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &ticket, nil
}

/**
 * FreeTicketResponse: Response for claimed free ticket
 */
type FreeTicketResponse struct {
	TicketID   string `json:"ticket_id"`
	EventID    string `json:"event_id"`
	UserID     string `json:"user_id"`
	Quantity   int    `json:"quantity"`
	QRCodeData string `json:"qr_code_data"`
	CreatedAt  string `json:"created_at"`
}
