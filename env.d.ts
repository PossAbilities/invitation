/**
 * Secrets are deliberately absent from wrangler.jsonc (that file is committed),
 * so `wrangler types` cannot see them. Declare them here instead.
 *
 * Set each one with `npx wrangler secret put NAME`. They are optional at the
 * type level because local development runs without them, and the code paths
 * that need them check first and fail with a clear message.
 */
declare namespace Cloudflare {
  interface Env {
    /** Sending key from resend.com. */
    RESEND_API_KEY?: string;
    /** Verified sender address, e.g. invitations@possabilities.org.uk. */
    INVITE_FROM_EMAIL?: string;
    /** Cloudflare Access team domain, e.g. possabilities.cloudflareaccess.com. */
    ACCESS_TEAM_DOMAIN?: string;
    /** Application Audience (AUD) tag of the Access application. */
    ACCESS_AUD?: string;
  }
}
