# Production stabilisation changes

## Root causes addressed

- Player statistics used a flat key/value structure, so the UI could not represent seasons or derive a stable position-specific schema.
- Account features grew as independent panels and destinations, creating repeated actions, weak hierarchy and long mobile pages.
- Onboarding collected performance and career data before a user could reach the product.
- Signup used the Supabase admin API with `email_confirm: true`, bypassing confirmation delivery entirely.
- Transactional email silently returned when configuration was missing and lacked provider-specific structured logs.
- The footer used desktop-scale spacing at every breakpoint.

## Architecture improvements

- `src/lib/player-stats.ts` is now the shared schema and compatibility layer for season statistics. Editors and public profiles consume the same position mapping, and legacy flat statistics remain readable.
- `/account` now exposes one role-aware workspace navigation: Overview, Profile, Organisation, Recruitment, Communication, Membership and Settings. Unsupported sections are omitted by role.
- Workspace panels share one compact collapsible section component. Upload controls retain a real local thumbnail/video preview instead of displaying only a filename or URL.
- Production onboarding collects only identity, role essentials and the minimum player position data; advanced statistics and media move to the workspace.
- Supabase Auth owns identity emails and Postmark owns application notifications. The boundary and deployment checklist are documented in `docs/email-infrastructure.md`.

## Performance and scalability

- Statistics column generation is memo-free deterministic work over a maximum of 20 rows and avoids per-cell object searches.
- Compact sections reduce initial visual load; secondary workspace content can remain collapsed without separate page navigation.
- Position definitions are data-driven, so adding a position or statistic does not require a new UI component.
- Email logs use stable event names and Postmark tags without logging recipient addresses or message bodies.

## Modified surfaces

- Account workspace: `src/app/account/page.tsx`, `src/components/account/`
- Statistics: `src/lib/player-stats.ts`, `src/components/account/CareerStatsBuilder.tsx`, `src/components/profiles/CareerStatsPanel.tsx`
- Onboarding: `src/app/onboarding/page.tsx`, `src/components/onboarding/OnboardingWizard.tsx`
- Authentication/email: `src/app/actions/auth.ts`, `src/app/auth/callback/route.ts`, `src/lib/email.ts`, `supabase/config.toml`, `supabase/templates/`
- Global footer: `src/components/layout/Footer.tsx`

## Critical stabilization audit — 2 August 2026

### Root causes found

- Auth accounts were not provisioned transactionally. Application profiles were only created during onboarding, leaving verified and OAuth users vulnerable to a missing-profile loop.
- The hosted Supabase SMTP hostname was the application URL rather than an SMTP server. This caused recovery requests to fail with `unexpected_failure` even though direct Postmark API delivery was healthy.
- Staff invitations called the Auth admin invitation endpoint before the invitee chose sign-in or signup, creating duplicate identities and breaking existing-account invitations.
- Instant calls wrote a database row without creating a Daily room or participant token. The incoming decline action also rejected those calls because instant rows are accepted at room creation time.
- Message tables were absent from the `supabase_realtime` publication. Clients had no subscription health state, reconnect backfill, or offline recovery.
- Account email, password, privacy, and deletion controls were placeholders or links instead of guarded mutations.
- Club media required a full form submission, displayed oversized media, and could not replace an existing slot without deleting it first.
- The dependency graph contained production advisories in Next.js, PostCSS, and Sharp.

### Production changes applied

- `20260802133405_production_stabilization.sql` installs deterministic Auth provisioning, repairs legacy Auth rows, publishes messaging/call tables to Realtime, and adds original filename metadata to club media.
- `20260802141432_auth_email_sync_and_daily_webhook_audit.sql` keeps confirmed Auth email changes synchronized and records every signed Daily webhook idempotently behind RLS.
- `20260802145454_secure_conversation_realtime_channels.sql` restricts typing and presence traffic to authenticated conversation participants.
- `20260802173000_allow_admin_realtime_audit.sql` preserves read-only administrator audit access without making conversation channels public.
- Supabase Auth now uses Postmark at `smtp.postmarkapp.com:587`, enforces eight-character passwords, retains MFA and eight-digit OTPs, uses a one-minute resend cooldown, and serves responsive branded confirmation, recovery, invite, email-change, and password-change templates.
- Postmark application mail retries transient provider and network failures and throws delivery errors to the caller instead of silently succeeding.
- Staff invites now use one hashed, expiring application invite for both existing and new accounts. Refresh revokes the old token and sends the replacement through Postmark.
- Daily Call Now creates the private room and caller token before redirecting, notifies the recipient over Realtime/push, and supports immediate accept/decline. Failed room attachment, decline, cancel, reschedule, and meeting completion clean up the Daily room.
- Password recovery now requires both the Supabase recovery session and a short-lived, signed, HTTP-only recovery marker; a normal signed-in session cannot reuse the reset form.
- Messaging now provides optimistic send, private typing broadcast, private presence, sent/read receipts, subscription status, automatic reconnect, and a full backfill after reconnect.
- Club media uses compact slots with filename, drag/drop, upload progress, replace, remove, instant local state, type/size validation, same-origin checks, and membership authorization.
- Account settings now implement email change, guarded password change, privacy, identity display, and irreversible deletion with subscription and ownership protections.
- The unused legacy `ProfileForm` and the non-functional mailto preference action were removed.
- Production dependencies are pinned to Node 22-compatible releases and npm reports zero known vulnerabilities.

### Verification evidence

- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed; all 155 static pages generated.
- `npm run test:e2e`: 13 passed across desktop and Pixel 7 viewports; one desktop skip is the intentionally mobile-only overflow assertion.
- `npm audit`: zero vulnerabilities.
- Supabase database lint: zero schema errors.
- All four migrations were dry-run before being applied and appear in hosted migration history.
- Direct Postmark health check: accepted with HTTP 200.
- Supabase recovery email: accepted with HTTP 200 and confirmed `Sent` in Postmark outbound activity.
- Daily API health check: private room created, participant token created, and room deleted with HTTP 200.

### Test boundaries

The checked-in Playwright suite is deliberately non-destructive and safe for local, Preview, and production smoke testing. Tests that create users, change real email addresses, charge subscriptions, or delete accounts must run against isolated staging users and a staging Supabase project; production credentials are not committed to the repository.
