/**
 * Transactional email helper via Resend.
 *
 * Environment variable required:
 *   RESEND_API_KEY   – your Resend API key
 *   RESEND_FROM      – sender address, e.g. "EuroScout Pro <noreply@euroscout.pro>"
 *
 * All functions silently no-op when RESEND_API_KEY is not set.
 */

import { Resend } from "resend";

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM ?? "EuroScout Pro <noreply@euroscout.pro>";

export interface CallRequestEmailParams {
  to: string;
  recipientName: string;
  senderName: string;
  teamName: string;
  reason: string;
  preferredTime: string;
  backupTime?: string;
  note?: string;
  conversationUrl: string;
}

export interface CallConfirmedEmailParams {
  to: string;
  recipientName: string;
  counterpartName: string;
  scheduledTime: string;
  conversationUrl: string;
  meetingUrl?: string;
}

export interface CallReminderEmailParams {
  to: string;
  recipientName: string;
  counterpartName: string;
  scheduledTime: string;
  roomUrl: string;
}

function wrap(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  body { margin:0; padding:0; background:#f1f5f9; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .wrap { max-width:560px; margin:32px auto; background:#fff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
  .header { background:#dc2626; padding:24px 32px; }
  .header h1 { margin:0; color:#fff; font-size:20px; font-weight:900; letter-spacing:-.5px; }
  .header p { margin:4px 0 0; color:rgba(255,255,255,.7); font-size:13px; font-weight:600; }
  .body { padding:28px 32px; }
  .body p { margin:0 0 16px; color:#334155; font-size:14px; line-height:1.65; }
  .meta { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:14px 18px; margin:20px 0; }
  .meta p { margin:0 0 6px; }
  .meta p:last-child { margin-bottom:0; }
  .meta .label { color:#64748b; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
  .meta .value { color:#0f172a; font-size:14px; font-weight:700; }
  .note { background:#fef2f2; border-left:3px solid #dc2626; padding:12px 16px; border-radius:0 4px 4px 0; margin:20px 0; }
  .note p { margin:0; color:#7f1d1d; font-size:13px; font-weight:600; }
  .cta { display:block; text-align:center; background:#dc2626; color:#fff; text-decoration:none; font-weight:900; font-size:14px; text-transform:uppercase; letter-spacing:.06em; padding:14px 24px; border-radius:6px; margin:24px 0 0; }
  .footer { background:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 32px; text-align:center; }
  .footer p { margin:0; color:#94a3b8; font-size:12px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>EuroScout Pro</h1><p>European American Football Intelligence</p></div>
  <div class="body">${bodyHtml}</div>
  <div class="footer"><p>You received this because you have an active EuroScout Pro account. &copy; ${new Date().getFullYear()} EuroScout Pro.</p></div>
</div>
</body>
</html>`;
}

export async function sendCallRequestEmail(params: CallRequestEmailParams) {
  const client = getClient();
  if (!client) return;
  const { to, recipientName, senderName, teamName, reason, preferredTime, backupTime, note, conversationUrl } = params;
  const html = wrap(
    `Video call request — ${teamName}`,
    `<p>Hi <strong>${recipientName}</strong>,</p>
<p><strong>${senderName}</strong> has sent you a video call request on behalf of <strong>${teamName}</strong>.</p>
<div class="meta">
  <p><span class="label">Reason</span><br><span class="value">${reason}</span></p>
  <p><span class="label">Preferred time</span><br><span class="value">${preferredTime}</span></p>
  ${backupTime ? `<p><span class="label">Backup time</span><br><span class="value">${backupTime}</span></p>` : ""}
</div>
${note ? `<div class="note"><p>${note}</p></div>` : ""}
<p>Head to your inbox to accept, decline, or propose a new time.</p>
<a class="cta" href="${conversationUrl}">View call request</a>`
  );
  await client.emails.send({ from: FROM, to, subject: `Video call request from ${teamName}`, html });
}

export async function sendCallConfirmedEmail(params: CallConfirmedEmailParams) {
  const client = getClient();
  if (!client) return;
  const { to, recipientName, counterpartName, scheduledTime, conversationUrl } = params;
  const html = wrap(
    "Video call confirmed",
    `<p>Hi <strong>${recipientName}</strong>,</p>
<p>Your video call with <strong>${counterpartName}</strong> has been confirmed.</p>
<div class="meta">
  <p><span class="label">Confirmed time</span><br><span class="value">${scheduledTime}</span></p>
</div>
<p>The Daily call room will open 5 minutes before your confirmed time. You'll be able to join from your inbox or account page.</p>
<a class="cta" href="${conversationUrl}">Open inbox</a>`
  );
  await client.emails.send({ from: FROM, to, subject: `Call confirmed — ${scheduledTime}`, html });
}

export async function sendCallReminderEmail(params: CallReminderEmailParams) {
  const client = getClient();
  if (!client) return;
  const { to, recipientName, counterpartName, scheduledTime, roomUrl } = params;
  const html = wrap(
    "Your call starts in 15 minutes",
    `<p>Hi <strong>${recipientName}</strong>,</p>
<p>Your video call with <strong>${counterpartName}</strong> starts in approximately <strong>15 minutes</strong>.</p>
<div class="meta">
  <p><span class="label">Scheduled time</span><br><span class="value">${scheduledTime}</span></p>
</div>
<p>Click below to join your call room now.</p>
<a class="cta" href="${roomUrl}">Join call now</a>`
  );
  await client.emails.send({ from: FROM, to, subject: `Your call starts in 15 minutes — ${counterpartName}`, html });
}
