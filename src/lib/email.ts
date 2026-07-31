/**
 * Transactional email helper via Postmark.
 *
 * Environment variables:
 *   POSTMARK_SERVER_TOKEN – token for the EuroScout transactional server
 *   POSTMARK_FROM         – verified sender, e.g. "EuroScout Pro <noreply@euroscoutpro.com>"
 *   POSTMARK_MESSAGE_STREAM – optional stream ID; defaults to "outbound"
 *
 * Delivery failures are logged with Postmark's error code and then thrown so
 * callers and production monitoring can distinguish a saved action from a
 * successfully delivered notification.
 */

const POSTMARK_EMAIL_ENDPOINT = "https://api.postmarkapp.com/email";
const FROM = process.env.POSTMARK_FROM ?? "EuroScout Pro <noreply@euroscoutpro.com>";
const MESSAGE_STREAM = process.env.POSTMARK_MESSAGE_STREAM ?? "outbound";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    };
    return entities[character];
  });
}

interface PostmarkResponse {
  ErrorCode?: number;
  Message?: string;
  MessageID?: string;
}

async function sendEmail(params: { to: string; subject: string; html: string; text: string; tag: string }) {
  const token = process.env.POSTMARK_SERVER_TOKEN?.trim();
  if (!token) {
    console.error("[email.postmark.configuration_missing]", { tag: params.tag });
    throw new Error("Transactional email is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(POSTMARK_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token
      },
      body: JSON.stringify({
        From: FROM,
        To: params.to,
        Subject: params.subject,
        HtmlBody: params.html,
        TextBody: params.text,
        MessageStream: MESSAGE_STREAM,
        Tag: params.tag,
        Metadata: { application: "euroscout-pro" }
      }),
      signal: AbortSignal.timeout(10_000)
    });
  } catch (error) {
    console.error("[email.postmark.network_failed]", {
      tag: params.tag,
      reason: error instanceof Error ? error.name : "unknown"
    });
    throw new Error("Transactional email delivery could not be reached.");
  }

  const payload = (await response.json().catch(() => null)) as PostmarkResponse | null;

  if (!response.ok) {
    console.error("[email.postmark.delivery_failed]", {
      tag: params.tag,
      status: response.status,
      errorCode: payload?.ErrorCode
    });
    throw new Error(payload?.Message ?? `Postmark email delivery failed with status ${response.status}.`);
  }

  console.info("[email.postmark.delivered]", { tag: params.tag, messageId: payload?.MessageID });
}

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
  const { to, recipientName, senderName, teamName, reason, preferredTime, backupTime, note, conversationUrl } = params;
  const safeRecipientName = escapeHtml(recipientName);
  const safeSenderName = escapeHtml(senderName);
  const safeTeamName = escapeHtml(teamName);
  const safeReason = escapeHtml(reason);
  const safePreferredTime = escapeHtml(preferredTime);
  const safeBackupTime = backupTime ? escapeHtml(backupTime) : "";
  const safeNote = note ? escapeHtml(note) : "";
  const safeConversationUrl = escapeHtml(conversationUrl);
  const html = wrap(
    `Video call request — ${safeTeamName}`,
    `<p>Hi <strong>${safeRecipientName}</strong>,</p>
<p><strong>${safeSenderName}</strong> has sent you a video call request on behalf of <strong>${safeTeamName}</strong>.</p>
<div class="meta">
  <p><span class="label">Reason</span><br><span class="value">${safeReason}</span></p>
  <p><span class="label">Preferred time</span><br><span class="value">${safePreferredTime}</span></p>
  ${safeBackupTime ? `<p><span class="label">Backup time</span><br><span class="value">${safeBackupTime}</span></p>` : ""}
</div>
${safeNote ? `<div class="note"><p>${safeNote}</p></div>` : ""}
<p>Head to your inbox to accept, decline, or propose a new time.</p>
<a class="cta" href="${safeConversationUrl}">View call request</a>`
  );
  await sendEmail({
    to,
    tag: "video-call-request",
    subject: `Video call request from ${teamName}`,
    html,
    text: `Hi ${recipientName},\n\n${senderName} sent you a video call request on behalf of ${teamName}.\nReason: ${reason}\nPreferred time: ${preferredTime}${backupTime ? `\nBackup time: ${backupTime}` : ""}${note ? `\nNote: ${note}` : ""}\n\nView call request: ${conversationUrl}`
  });
}

export async function sendCallConfirmedEmail(params: CallConfirmedEmailParams) {
  const { to, recipientName, counterpartName, scheduledTime, conversationUrl } = params;
  const safeRecipientName = escapeHtml(recipientName);
  const safeCounterpartName = escapeHtml(counterpartName);
  const safeScheduledTime = escapeHtml(scheduledTime);
  const safeConversationUrl = escapeHtml(conversationUrl);
  const html = wrap(
    "Video call confirmed",
    `<p>Hi <strong>${safeRecipientName}</strong>,</p>
<p>Your video call with <strong>${safeCounterpartName}</strong> has been confirmed.</p>
<div class="meta">
  <p><span class="label">Confirmed time</span><br><span class="value">${safeScheduledTime}</span></p>
</div>
<p>The Daily call room will open 5 minutes before your confirmed time. You'll be able to join from your inbox or account page.</p>
<a class="cta" href="${safeConversationUrl}">Open inbox</a>`
  );
  await sendEmail({
    to,
    tag: "video-call-confirmed",
    subject: `Call confirmed — ${scheduledTime}`,
    html,
    text: `Hi ${recipientName},\n\nYour video call with ${counterpartName} is confirmed for ${scheduledTime}. The call room opens 5 minutes beforehand.\n\nOpen inbox: ${conversationUrl}`
  });
}

export async function sendCallReminderEmail(params: CallReminderEmailParams) {
  const { to, recipientName, counterpartName, scheduledTime, roomUrl } = params;
  const safeRecipientName = escapeHtml(recipientName);
  const safeCounterpartName = escapeHtml(counterpartName);
  const safeScheduledTime = escapeHtml(scheduledTime);
  const safeRoomUrl = escapeHtml(roomUrl);
  const html = wrap(
    "Your call starts in 15 minutes",
    `<p>Hi <strong>${safeRecipientName}</strong>,</p>
<p>Your video call with <strong>${safeCounterpartName}</strong> starts in approximately <strong>15 minutes</strong>.</p>
<div class="meta">
  <p><span class="label">Scheduled time</span><br><span class="value">${safeScheduledTime}</span></p>
</div>
<p>Click below to join your call room now.</p>
<a class="cta" href="${safeRoomUrl}">Join call now</a>`
  );
  await sendEmail({
    to,
    tag: "video-call-reminder",
    subject: `Your call starts in 15 minutes — ${counterpartName}`,
    html,
    text: `Hi ${recipientName},\n\nYour video call with ${counterpartName} starts in approximately 15 minutes at ${scheduledTime}.\n\nJoin call: ${roomUrl}`
  });
}
