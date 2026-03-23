package auth

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// Mailer sends transactional emails via Gmail SMTP (STARTTLS port 587).
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

// appURL returns the correct base URL for the current environment.
// Production → www.bukr.app, everything else → bukr.onrender.com (dev-staging).
func appURL() string {
	if os.Getenv("APP_ENV") == "production" {
		return "https://www.bukr.app"
	}
	return "https://bukr.onrender.com"
}

// send delivers a single HTML email over STARTTLS.
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
		"Content-Transfer-Encoding: quoted-printable",
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

// SendWelcome delivers the post-registration welcome email.
func (m *Mailer) SendWelcome(to, name string) error {
	return m.send(to, "You're in. Welcome to Bukr.", welcomeHTML(name))
}

// SendOTP delivers the password reset code.
func (m *Mailer) SendOTP(to, name, otp string) error {
	return m.send(to, "Your Bukr reset code — expires in 10 minutes.", otpHTML(name, otp))
}

// SendAdminWelcome delivers credentials to a newly provisioned admin account.
func (m *Mailer) SendAdminWelcome(to, name, tempPassword string) error {
	return m.send(to, "Your Bukr admin access is live.", adminWelcomeHTML(name, tempPassword))
}

// ── Shared layout ─────────────────────────────────────────────────────────────

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
  .btn:hover{background:#06b6d4;}
  .otp-box{background:#0f1a27;border:1px solid #1e3a4a;border-radius:14px;
            padding:30px;text-align:center;margin:24px 0;}
  .otp-code{font-size:44px;font-weight:900;letter-spacing:14px;color:#22d3ee;
             font-family:'Courier New',monospace;}
  .otp-note{font-size:12px;color:#475569;margin-top:10px;}
  .stat-row{display:flex;gap:0;margin:28px 0;border:1px solid #1e293b;border-radius:12px;overflow:hidden;}
  .stat{flex:1;padding:16px 12px;text-align:center;border-right:1px solid #1e293b;}
  .stat:last-child{border-right:none;}
  .stat-val{display:block;font-size:18px;font-weight:800;color:#22d3ee;}
  .stat-lbl{display:block;font-size:11px;color:#475569;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;}
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
  <div class="header">
    <div class="logo">Bukr<span>.</span></div>
  </div>
  %s
  <div class="footer">
    <hr class="divider">
    <p class="footer-text">
      You received this because an action was taken on your Bukr account.<br>
      If this wasn't you, ignore this email — your account is untouched.<br><br>
      &copy; %d Bukr &mdash; Make every moment count.<br>
      <a href="%s/privacy-policy">Privacy Policy</a> &nbsp;&middot;&nbsp;
      <a href="%s">bukr.app</a>
    </p>
  </div>
</div>
</body>
</html>`, baseStyle, content, time.Now().Year(), base, base)
}

// ── Welcome email ─────────────────────────────────────────────────────────────

func welcomeHTML(name string) string {
	base := appURL()
	body := fmt.Sprintf(`
  <div class="body">
    <div class="tag">Welcome</div>
    <h1 class="title">%s, your first moment is waiting.</h1>
    <p class="text">
      You just joined the fastest way to discover and book events in your city.
      No friction. No hidden fees eating your wallet. Just <strong>2%% platform fee</strong>
      and tickets in your hand in under 3 seconds.
    </p>
    <div class="stat-row">
      <div class="stat"><span class="stat-val">&lt; 3s</span><span class="stat-lbl">Booking time</span></div>
      <div class="stat"><span class="stat-val">2%%</span><span class="stat-lbl">Our only fee</span></div>
      <div class="stat"><span class="stat-val">24/7</span><span class="stat-lbl">Support</span></div>
    </div>
    <p class="text">
      Thousands of events are live right now. Concerts, pop-ups, conferences, parties —
      the kind of nights you'll actually remember. Go find yours.
    </p>
    <a href="%s/app" class="btn">Explore Events &rarr;</a>
    <p class="text" style="margin-top:24px;font-size:13px;color:#475569;">
      Button not working? Copy this into your browser:<br>
      <a href="%s/app">%s/app</a>
    </p>
  </div>`, name, base, base, base)
	return emailShell(body)
}

// ── OTP / password reset email ────────────────────────────────────────────────

func otpHTML(name, otp string) string {
	expiry := time.Now().UTC().Add(10 * time.Minute).Format("15:04 on 02 Jan 2006")
	body := fmt.Sprintf(`
  <div class="body">
    <div class="tag">Password Reset</div>
    <h1 class="title">Your reset code, %s.</h1>
    <p class="text">
      Someone requested a password reset for this account. If that was you,
      use the code below. If it wasn't — relax, your account is safe. Just ignore this.
    </p>
    <div class="otp-box">
      <div class="otp-code">%s</div>
      <p class="otp-note">Valid for 10 minutes &middot; Do not share this code &middot; Expires %s UTC</p>
    </div>
    <p class="text">
      Enter this code on the reset page along with your new password.
      After <strong>3 wrong attempts</strong> the code is locked and you'll need a fresh one.
      We don't mess around with security.
    </p>
    <p class="text" style="font-size:13px;color:#475569;">
      Didn't request this? No action needed. The code expires on its own.
    </p>
  </div>`, name, otp, expiry)
	return emailShell(body)
}

// ── Admin welcome email ───────────────────────────────────────────────────────

func adminWelcomeHTML(name, tempPassword string) string {
	base := appURL()
	body := fmt.Sprintf(`
  <div class="body">
    <div class="tag">Admin Access</div>
    <h1 class="title">You're in, %s. Handle with care.</h1>
    <p class="text">
      A Bukr admin account has been provisioned for you.
      Use the temporary credentials below to sign in, then change your password immediately.
      Admin sessions expire in <strong>10 minutes</strong> — that's intentional.
    </p>
    <div class="otp-box">
      <p style="color:#64748b;font-size:12px;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;">Temporary Password</p>
      <div class="otp-code" style="font-size:20px;letter-spacing:6px;">%s</div>
      <p class="otp-note">Change this on first login. Do not store it. Do not share it.</p>
    </div>
    <a href="%s/admin" class="btn">Open Admin Panel &rarr;</a>
    <p class="text" style="margin-top:24px;font-size:13px;color:#475569;">
      All admin actions are logged. You've been warned (kindly).
    </p>
  </div>`, name, tempPassword, base)
	return emailShell(body)
}
