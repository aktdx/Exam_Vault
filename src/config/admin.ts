// Read super-admin emails from the SUPERADMIN_EMAILS environment variable.
// Supports a comma-separated list, e.g. "a@example.com,b@example.com",
// so additional super-admins can be granted access without a code change.
const raw = process.env.SUPERADMIN_EMAILS ?? '';

const superAdminEmails = new Set(
  raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
);

/**
 * Returns true when the given email belongs to a configured super-admin.
 * Comparison is case-insensitive and trims surrounding whitespace.
 */
export function isSuperAdminEmail(email: string): boolean {
  return superAdminEmails.has(email.trim().toLowerCase());
}
