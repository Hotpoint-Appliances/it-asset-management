import { getGraphAccessToken } from "./graphClient";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

const SEND_TIMEOUT_MS = 15_000;

/** Sends one HTML email from `NOTIFICATION_FROM_EMAIL` via Graph `sendMail`. Throws on any
 * failure; callers treat email as best-effort and decide what to log (see
 * lib/notifications/triggers.ts), nothing here should ever sit inside an asset transaction. */
export async function sendEmail({
  to,
  subject,
  html,
}: EmailMessage): Promise<void> {
  const token = await getGraphAccessToken();
  const from = process.env.NOTIFICATION_FROM_EMAIL!;
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: false,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    },
  );
  // Graph answers 202 Accepted with an empty body on success.
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Graph sendMail ${res.status}: ${detail.slice(0, 300)}`);
  }
}
