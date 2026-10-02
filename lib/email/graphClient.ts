import { ConfidentialClientApplication } from "@azure/msal-node";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

/** Email is optional: without every MSAL variable plus a sender mailbox the app still runs, and
 * notifications are created in-app with `email_sent` left false (the scheduled check retries
 * them once email is configured, see lib/notifications/triggers.ts).
 * `NOTIFICATION_EMAIL_ENABLED=false` switches email off while keeping the credentials, for dev
 * and staging databases whose users are real people who shouldn't receive test mail. */
export function isEmailConfigured(): boolean {
  if (
    process.env.NOTIFICATION_EMAIL_ENABLED?.trim().toLowerCase() === "false"
  ) {
    return false;
  }
  return Boolean(
    process.env.MSAL_CLIENT_ID &&
    process.env.MSAL_CLIENT_SECRET &&
    process.env.MSAL_TENANT_ID &&
    process.env.NOTIFICATION_FROM_EMAIL,
  );
}

const globalForMsal = globalThis as unknown as {
  msalApp?: ConfidentialClientApplication;
};

/** One confidential-client app per process (kept on globalThis like the pg pool, so dev hot
 * reloads don't discard it): MSAL caches the app-only token in memory and only goes back to
 * Entra ID when it's near expiry. */
function getMsalApp(): ConfidentialClientApplication {
  if (!globalForMsal.msalApp) {
    globalForMsal.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.MSAL_CLIENT_ID!,
        clientSecret: process.env.MSAL_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${process.env.MSAL_TENANT_ID}`,
      },
    });
  }
  return globalForMsal.msalApp;
}

/** App-only Graph token via the client credentials flow. The app registration needs the
 * `Mail.Send` application permission (admin-consented); scope it to the sender mailbox with an
 * Exchange application access policy so the app can't send as anyone else. */
export async function getGraphAccessToken(): Promise<string> {
  if (!isEmailConfigured()) {
    throw new Error(
      "Email is not configured (MSAL_* / NOTIFICATION_FROM_EMAIL)",
    );
  }
  const result = await getMsalApp().acquireTokenByClientCredential({
    scopes: [GRAPH_SCOPE],
  });
  if (!result?.accessToken) {
    throw new Error("MSAL returned no access token");
  }
  return result.accessToken;
}
