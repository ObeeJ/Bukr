package notifications

import (
	"fmt"
	"net/smtp"
	"os"
)

// dispatchTicketNotification sends an email for a ticket lifecycle event.
// Uses Gmail SMTP with app password. Silently skips if SMTP_HOST is not set.
func dispatchTicketNotification(notifType, email, name, eventTitle string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	if host == "" || user == "" || pass == "" {
		return nil // SMTP not configured — skip silently
	}
	if port == "" {
		port = "587"
	}

	subject, body := buildEmailContent(notifType, name, eventTitle)
	msg := fmt.Sprintf(
		"From: Bukr <noreply@bukr.app>\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		email, subject, body,
	)

	auth := smtp.PlainAuth("", user, pass, host)
	return smtp.SendMail(host+":"+port, auth, user, []string{email}, []byte(msg))
}

func buildEmailContent(notifType, name, eventTitle string) (subject, body string) {
	switch notifType {
	case "usage_depleted":
		return "Your ticket uses are up — " + eventTitle,
			fmt.Sprintf("Hi %s,\n\nAll your uses for \"%s\" have been consumed.\n\nIf your ticket is renewable, open Bukr to top it up.\n\n— Bukr", name, eventTitle)
	case "expiry_warning":
		return "Your ticket expires soon — " + eventTitle,
			fmt.Sprintf("Hi %s,\n\nYour ticket for \"%s\" expires in 1 hour. Use it before it's gone!\n\n— Bukr", name, eventTitle)
	case "expired":
		return "Your ticket has expired — " + eventTitle,
			fmt.Sprintf("Hi %s,\n\nYour ticket for \"%s\" has expired.\n\nIf you'd like to renew, open Bukr.\n\n— Bukr", name, eventTitle)
	case "renewal_prompt":
		return "Renew your ticket — " + eventTitle,
			fmt.Sprintf("Hi %s,\n\nYour ticket for \"%s\" has run out of uses. Open Bukr to renew and keep going.\n\n— Bukr", name, eventTitle)
	case "scan_confirmed":
		return "Ticket scanned — " + eventTitle,
			fmt.Sprintf("Hi %s,\n\nYour ticket for \"%s\" was just scanned. If this wasn't you, contact support immediately.\n\n— Bukr", name, eventTitle)
	default:
		return "Bukr ticket update — " + eventTitle,
			fmt.Sprintf("Hi %s,\n\nThere's an update on your ticket for \"%s\".\n\n— Bukr", name, eventTitle)
	}
}
