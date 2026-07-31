# Video call production setup

EuroScout uses Daily private rooms and participant-bound meeting tokens. `DAILY_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, and the Supabase server variables must exist in both Vercel Preview and Production.

The application exposes `POST /api/webhooks/daily`. After deploying that route:

1. Create a base64-encoded HMAC secret and add it to Vercel as `DAILY_WEBHOOK_SECRET` for Preview and Production.
2. Create a Daily webhook pointing at `https://euroscoutpro.com/api/webhooks/daily` and subscribe it to `meeting.ended` with exponential retry.
3. Use the same base64 secret as the webhook `hmac` value.
4. Confirm the webhook is `ACTIVE` and its failed count remains zero.

Daily does not provide a dedicated project CLI. Use its REST API for room, token, and webhook automation. Never place `DAILY_API_KEY` or `DAILY_WEBHOOK_SECRET` in a `NEXT_PUBLIC_` variable.

Vercel cron invokes room preparation every five minutes and call reminders every fifteen minutes. The join action also creates a room on demand, so an authorised participant still has a safe fallback if a cron invocation is delayed.
