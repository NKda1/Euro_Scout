# EuroScout Pro email infrastructure

## Ownership model

EuroScout Pro uses two delivery paths. They share the verified sending domain but have separate responsibilities.

| Email | Owner | Template location |
| --- | --- | --- |
| Confirm signup, password recovery, invitation, email change | Supabase Auth through Postmark SMTP | Hosted Supabase: Authentication → Email Templates. Local development: `supabase/templates/` |
| Video-call request, confirmation and reminder | Application through Postmark REST API | `src/lib/email.ts` |

Do not put Supabase Auth templates in a database table. Hosted Supabase reads them from its Auth configuration; the HTML files in this repository are the local-development and source-control copies. Postmark-hosted templates are not currently required because application notifications are rendered in code.

## Required production configuration

### Vercel

Set these for Production and Preview, then redeploy so the running functions receive the new values:

```text
NEXT_PUBLIC_APP_URL=https://euroscoutpro.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
POSTMARK_SERVER_TOKEN=<server-token>
POSTMARK_FROM=EuroScout Pro <noreply@euroscoutpro.com>
POSTMARK_MESSAGE_STREAM=outbound
```

`POSTMARK_FROM` is a valid Vercel environment value. In the dashboard, enter the value without shell quotes. Quotes are only needed when entering a value through a shell. Never expose the Postmark token or Supabase service-role key through a `NEXT_PUBLIC_` variable.

### Supabase Auth

In Authentication settings:

- Site URL: `https://euroscoutpro.com`
- Redirect allow list: `https://euroscoutpro.com/auth/callback`, `https://www.euroscoutpro.com/auth/callback`, and the required Vercel preview pattern.
- Email confirmation: enabled.
- Secure email change: enabled.
- Custom SMTP: enabled.
- SMTP host: `smtp.postmarkapp.com`
- SMTP port: `587`
- SMTP username: the Postmark Server API Token.
- SMTP password: the same Postmark Server API Token.
- Sender name: `EuroScout Pro`
- Sender email: `noreply@euroscoutpro.com`

Copy the confirmation, recovery and invite markup from `supabase/templates/` into the matching hosted Supabase Email Templates. Supabase Auth emails must use links containing `{{ .TokenHash }}` and the application callback route. Disable link tracking for the Auth message stream because rewritten authentication links can fail verification.

The production signup path uses `supabase.auth.signUp`; it must not create pre-confirmed users with the admin API. The callback accepts PKCE codes and token hashes and writes the resulting session cookies before redirecting to onboarding.

### Postmark

- Use a transactional Server, not a broadcast stream.
- Verify `euroscoutpro.com` or the exact sender signature.
- Keep the application stream ID in `POSTMARK_MESSAGE_STREAM` (default `outbound`).
- Disable open/link tracking for authentication email. Tracking on non-auth application notifications is optional.
- Review Activity for API/SMTP rejection details and use the `Tag` values emitted by `src/lib/email.ts`.

### GoDaddy DNS

Maintain one record of each policy type for the same host:

- SPF: exactly one TXT record at `@`; it must include every legitimate sender, including Postmark, without adding a second `v=spf1` record.
- DKIM: the TXT record supplied by Postmark at its selector under `_domainkey`.
- Return-Path: the CNAME supplied by Postmark, usually pointing to `pm.mtasv.net`.
- DMARC: exactly one TXT record at `_dmarc`.

Start DMARC in monitoring mode while reviewing aggregate reports:

```text
v=DMARC1; p=none; adkim=r; aspf=r; rua=mailto:nygel@euroscoutpro.com,mailto:dmarc_rua@onsecureserver.net;
```

After SPF and DKIM consistently align, change only the policy inside that single record to `p=quarantine`; do not add a second DMARC record. Move to `p=reject` only after monitoring confirms all legitimate senders are aligned.

## Verification checklist

1. Redeploy after changing Vercel environment values.
2. Create a new account with a real non-team email and confirm the message appears in Postmark Activity.
3. Open the confirmation button and verify it lands on `/welcome`, then complete onboarding and verify the final redirect is `/dashboard?onboarded=1`.
4. Request a password reset, open it once, choose a new password and sign in.
5. Resend a confirmation and confirm the response stays generic for registered and unknown addresses.
6. Send a club staff invite and verify both new-user and existing-user paths.
7. Trigger a video-call request and verify the Postmark Activity tag is `video-call-request`.
8. Confirm failed Postmark calls appear as structured `[email.postmark.*]` entries in Vercel logs without recipient addresses, tokens or message content.
9. Verify public DNS with an independent resolver after the TTL has elapsed. There must be one SPF policy and one DMARC policy.

## Operational notes

- Rotate a secret immediately if it is pasted into chat, committed, or included in a public log.
- Keep Auth and application traffic in separate Postmark message streams when volume grows, so one category cannot damage the reputation of the other.
- Supabase's built-in SMTP is for development only. Production requires custom SMTP and appropriate rate limits.
- Postmark acceptance means the provider accepted the message; use Postmark Activity to distinguish delivered, bounced, suppressed and rejected states.
