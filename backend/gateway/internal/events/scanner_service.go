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

