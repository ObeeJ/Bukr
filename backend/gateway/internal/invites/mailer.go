package invites

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// Mailer sends invite emails. Mirrors the pattern in auth/mailer.go exactly.
type Mailer struct {
	host     string
	port     string
	user     string
	pass     string
	fromName string
}

func NewMailer(host, port, user, pass, fromName string) *Mailer {
	return &Mailer{host: host, port: port, user: user, pass: pass, fromName: fromName}
}

func appURL() string {
	if os.Getenv("APP_ENV") == "production" {
		return "https://www.bukr.app"
	}
	return "https://bukr.onrender.com"
}

func (m *Mailer) send(to, subject, html string) error {
	auth := smtp.PlainAuth("", m.user, m.pass, m.host)
	addr := m.host + ":" + m.port
	from := fmt.Sprintf("%s <%s>", m.fromName, m.user)
	headers := strings.Join([]string{
		"From: " + from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
	}, "\r\n")
	body := headers + "\r\n" + html

	conn, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("smtp dial: %w", err)
	}
	defer conn.Close()
	if err := conn.StartTLS(&tls.Config{ServerName: m.host}); err != nil {
		return fmt.Errorf("starttls: %w", err)
	}
	if err := conn.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}
	if err := conn.Mail(m.user); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := conn.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}
	wc, err := conn.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	defer wc.Close()
	_, err = fmt.Fprint(wc, body)
	return err
}

// SendInvite delivers the invitation email to a guest.
// The token is embedded in the deep-link URL — tapping it opens the app
// directly on the redemption screen with the token pre-filled.
func (m *Mailer) SendInvite(to, name, eventTitle, eventDate, token string) error {
	subject := fmt.Sprintf("You're invited to %s 🎟️", eventTitle)
	return m.send(to, subject, inviteHTML(to, name, eventTitle, eventDate, token))
}

// inviteHTML renders the invitation email. Same dark theme as the rest of Bukr.
func inviteHTML(recipientEmail, name, eventTitle, eventDate, token string) string {
	base := appURL()
	// Deep link: app handles /invite?token=... and routes to the redemption screen
	redeemURL := fmt.Sprintf("%s/invite?token=%s", base, token)

	displayName := name
	if displayName == "" {
		displayName = "there"
	}

	body := fmt.Sprintf(`
  <div class="body">
    <div class="tag">You're Invited</div>
    <h1 class="title">Hey %s, your spot is reserved.</h1>
    <p class="text">
      You've been personally invited to <strong>%s</strong> on <strong>%s</strong>.
      This invitation is yours alone — it's tied to this email address and
      cannot be transferred.
    </p>
    <div class="otp-box">
      <p style="color:#64748b;font-size:12px;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;">Your Event</p>
      <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:6px;">%s</div>
      <div style="font-size:14px;color:#22d3ee;">%s</div>
    </div>
    <a href="%s" class="btn">Confirm My Spot &rarr;</a>
    <p class="text" style="margin-top:24px;font-size:13px;color:#475569;">
      Button not working? Copy this link into your browser:<br>
      <a href="%s">%s</a>
    </p>
    <p class="text" style="font-size:12px;color:#334155;margin-top:20px;">
      This invitation is single-use and tied to <strong>%s</strong>.
      If you share this link, it will not work for anyone else.
      The organizer can revoke it at any time before you confirm.
    </p>
  </div>`,
		displayName,
		eventTitle, eventDate,
		eventTitle, eventDate,
		redeemURL,
		redeemURL, redeemURL,
		recipientEmail,
	)

	return emailShell(body)
}

// emailShell wraps content in the shared Bukr email layout.
// Duplicated from auth/mailer.go intentionally — the invites package
// must not import auth to avoid a circular dependency.
const baseStyle = `
  body{margin:0;padding:0;background:#080810;font-family:'Helvetica Neue',Arial,sans-serif;}
  .wrap{max-width:580px;margin:0 auto;background:#080810;}
  .header{padding:36px 40px 0;}
  .logo{font-size:26px;font-weight:900;letter-spacing:-1.5px;color:#22d3ee;}
  .logo span{color:#fff;}
  .body{padding:32px 40px;}
  .tag{display:inline-block;background:#0d2535;color:#22d3ee;font-size:10px;font-weight:700;
       padding:4px 12px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;margin-bottom:22px;}
  .title{font-size:24px;font-weight:800;color:#fff;margin:0 0 14px;line-height:1.25;}
  .text{font-size:15px;color:#94a3b8;line-height:1.75;margin:0 0 18px;}
  .text a{color:#22d3ee;text-decoration:none;}
  .text strong{color:#e2e8f0;}
  .btn{display:inline-block;background:#22d3ee;color:#080810;font-size:15px;font-weight:800;
       padding:15px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.2px;}
  .otp-box{background:#0f1a27;border:1px solid #1e3a4a;border-radius:14px;
            padding:30px;text-align:center;margin:24px 0;}
  .divider{border:none;border-top:1px solid #1e293b;margin:28px 0;}
  .footer{padding:0 40px 40px;}
  .footer-text{font-size:11px;color:#334155;line-height:1.7;}
  .footer-text a{color:#475569;text-decoration:none;}
`

func emailShell(content string) string {
	base := appURL()
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bukr</title>
<style>%s</style>
</head>
<body>
<div class="wrap">
  <div class="header"><div class="logo">Bukr<span>.</span></div></div>
  %s
  <div class="footer">
    <hr class="divider">
    <p class="footer-text">
      You received this because someone added you to their guest list on Bukr.<br>
      If this was a mistake, simply ignore this email — no account will be created.<br><br>
      &copy; %d Bukr &mdash; Make every moment count.<br>
      <a href="%s/privacy-policy">Privacy Policy</a> &nbsp;&middot;&nbsp;
      <a href="%s">bukr.app</a>
    </p>
  </div>
</div>
</body>
</html>`, baseStyle, content, time.Now().Year(), base, base)
}
