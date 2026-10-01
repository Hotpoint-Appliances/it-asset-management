export interface EmailItem {
  title: string;
  message: string | null;
  /** Absolute URL, omitted when the recipient couldn't open it (see Notification.assetViewable). */
  link: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Absolute link into the app for emails; null when `ITAM_APP_URL` isn't set, so a mail never
 * carries a broken relative link. */
export function appUrl(path: string): string | null {
  const base = process.env.ITAM_APP_URL?.replace(/\/+$/, "");
  return base ? `${base}${path}` : null;
}

/** One email per recipient: a single notification reads as itself, several (a scheduled run
 * finding many warranties, or retried unsent ones) are grouped into one digest instead of a
 * burst of separate mails. Inline styles only, mail clients ignore <style> blocks. */
export function renderNotificationEmail(
  recipientName: string | null,
  items: EmailItem[],
): { subject: string; html: string } {
  const subject =
    items.length === 1
      ? items[0].title
      : `${items.length} IT asset notifications`;

  const rows = items
    .map((item) => {
      const title = escapeHtml(item.title);
      const heading = item.link
        ? `<a href="${escapeHtml(item.link)}" style="color:#4f46e5;text-decoration:none">${title}</a>`
        : title;
      const message = item.message
        ? `<div style="color:#52525b;margin-top:4px">${escapeHtml(item.message)}</div>`
        : "";
      return `<tr><td style="padding:12px 0;border-top:1px solid #e4e4e7">
        <div style="font-weight:600">${heading}</div>${message}</td></tr>`;
    })
    .join("");

  const greeting = recipientName
    ? `Hi ${escapeHtml(recipientName)},`
    : "Hello,";
  const footerLink = appUrl("/notifications");
  const footer = footerLink
    ? `<a href="${escapeHtml(footerLink)}" style="color:#4f46e5">View all notifications</a> · `
    : "";

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#18181b">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px">
    <tr><td style="font-size:16px;font-weight:600;padding-bottom:8px">IT Asset Manager</td></tr>
    <tr><td style="padding-bottom:8px">${greeting}</td></tr>
    ${rows}
    <tr><td style="padding-top:16px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px">
      ${footer}This is an automated message from the IT Asset Manager.
    </td></tr>
  </table></body></html>`;

  return { subject, html };
}
