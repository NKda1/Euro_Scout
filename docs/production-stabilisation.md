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
