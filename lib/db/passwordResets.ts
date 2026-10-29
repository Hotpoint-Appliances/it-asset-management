import { createHash, randomBytes } from "node:crypto";
import { query, withTransaction } from "./query";
import { hashPassword } from "@/lib/auth/password";

/** How long an emailed reset link works. */
export const RESET_TOKEN_TTL_MINUTES = 30;
/** A user can't be sent another link sooner than this, so the form can't flood an inbox. */
const RESEND_COOLDOWN_SECONDS = 60;

/** Only this hash is stored; the raw token exists in the email alone. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Issues a new reset token for `userId`, replacing any earlier unused ones, or returns null if
 * one was issued within the cooldown. Returns the raw token for the email link. */
export async function createPasswordResetToken(
  userId: string,
): Promise<string | null> {
  const token = randomBytes(32).toString("base64url");
  return withTransaction(async (client) => {
    // Serializes concurrent requests for the same user, so the cooldown check can't race.
    await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [
      userId,
    ]);
    const recent = await client.query(
      `SELECT 1 FROM password_reset_tokens
       WHERE user_id = $1 AND created_at > now() - make_interval(secs => $2)`,
      [userId, RESEND_COOLDOWN_SECONDS],
    );
    if (recent.rowCount) return null;
    // Earlier links stop working once a newer one is sent; long-expired rows are swept too.
    await client.query(
      `DELETE FROM password_reset_tokens
       WHERE user_id = $1 OR expires_at < now() - interval '1 day'`,
      [userId],
    );
    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + make_interval(mins => $3))`,
      [userId, hashToken(token), RESET_TOKEN_TTL_MINUTES],
    );
    return token;
  });
}

/** Whether `token` is unused, unexpired and belongs to an active user. The reset page checks
 * this up front so an expired link says so before the user types a new password. */
export async function isPasswordResetTokenValid(
  token: string,
): Promise<boolean> {
  const result = await query(
    `SELECT 1
     FROM password_reset_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > now()
       AND u.is_active`,
    [hashToken(token)],
  );
  return Boolean(result.rowCount);
}

/** Sets the new password if `token` is still valid, marking it used and stamping
 * password_changed_at (which revokes every existing session, lib/auth/session.ts). Returns the
 * user for the confirmation email, or null when the link is invalid, used or expired. */
export async function resetPasswordWithToken(
  token: string,
  password: string,
): Promise<{ email: string; fullName: string } | null> {
  const passwordHash = await hashPassword(password);
  return withTransaction(async (client) => {
    // FOR UPDATE: two submits of the same link can't both succeed.
    const found = await client.query<{
      id: number;
      user_id: string;
      email: string;
      full_name: string;
    }>(
      `SELECT t.id, t.user_id, u.email, u.full_name
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1 AND t.used_at IS NULL AND t.expires_at > now()
         AND u.is_active
       FOR UPDATE OF t`,
      [hashToken(token)],
    );
    const row = found.rows[0];
    if (!row) return null;
    await client.query(
      `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
      [row.id],
    );
    // Whole seconds, matching the JWT `iat` it's compared against (see app/api/auth/password).
    const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    await client.query(
      `UPDATE users
       SET password_hash = $2, password_changed_at = $3, updated_at = now()
       WHERE id = $1`,
      [row.user_id, passwordHash, changedAt],
    );
    return { email: row.email, fullName: row.full_name };
  });
}
