# Auth email setup

Everything below is configured in the Supabase dashboard, not in this repo.

## The problem this solves

Password reset links appeared to expire the instant they arrived.

They were not expiring. Supabase recovery tokens are **single use**, and
Outlook, Microsoft Defender Safe Links and most corporate mail filters
**pre-fetch every URL in an incoming email** to virus check it before the
recipient sees the message. That automated visit consumes the token. By the
time a human clicks, the link has genuinely already been used, and Supabase
correctly reports it as invalid.

Nothing in the app can stop a scanner following a link. The fix is to offer a
path a scanner cannot walk: a **six digit code the user types in**.

## 1. Recovery email template

Authentication → Emails → Reset Password. The template must include the code
as well as the link, or the fallback has nothing to work with.

```html
<h2>Reset your FieldMS password</h2>

<p>Use this code to set a new password:</p>

<p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:24px 0;">
  {{ .Token }}
</p>

<p>Enter it at
  <a href="{{ .SiteURL }}/reset-password">{{ .SiteURL }}/reset-password</a>
</p>

<hr>

<p style="color:#64748b;font-size:13px;">
  Or use this one time link. If your email provider scans links it may already
  have been used, in which case fall back to the code above.
</p>

<p>
  <a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">
    Set a new password
  </a>
</p>

<p style="color:#64748b;font-size:13px;">
  Didn't ask for this? Ignore this email, nothing has changed.
</p>
```

Two things matter here:

- `{{ .Token }}` is the six digit code. Without it the fallback is useless.
- The link uses `?token_hash=…&type=recovery` pointing at our own route,
  rather than the default `{{ .ConfirmationURL }}`. `token_hash` is verified
  with `verifyOtp`, which needs no PKCE verifier in the browser, so the link
  also works if it is opened on a different device to the one that asked.

## 2. Redirect allowlist

Authentication → URL Configuration → Redirect URLs. Add both:

```
http://localhost:3000/reset-password
https://your-production-domain/reset-password
```

Without these the link bounces to the site root and the reset never starts.

## 3. Token lifetime

Authentication → Sign In / Providers → Email → Email OTP Expiration.
3600 seconds (one hour) is sensible. If this is set very low, links really do
expire quickly and the scanner theory is not the whole story.

## 4. Email confirmation, during development

Authentication → Sign In / Providers → Email → **Confirm email**.

While building, turn this **off**. Supabase's built in SMTP only delivers to
your own team address and rate limits to a few messages an hour, so with
confirmation on, new signups are created but stranded unconfirmed and can
never sign in.

Turn it back on before real users, together with proper SMTP below.

## 5. Custom SMTP

Project Settings → Authentication → SMTP Settings.

`RESEND_API_KEY` is already referenced in `.env.local`. Point Supabase at
Resend (or any provider) so recovery and confirmation mail actually reaches
users and is not rate limited.

## How the app consumes all of this

`app/reset-password/page.tsx` accepts, in order:

1. `?token_hash=&type=recovery` → `verifyOtp`, works cross device
2. `?code=` → PKCE exchange, same browser only
3. `#access_token` fragment → picked up automatically by the browser client
4. a typed six digit code → `verifyOtp` with email plus token

If 1 to 3 all fail it does not dead end. It shows the code entry form and
explains that a scanner probably consumed the link.
