import { env } from "cloudflare:workers";

/**
 * Outbound email.
 *
 * Kept behind a small interface with a single Resend adapter, so swapping
 * provider later is one file rather than a rewrite. The API key is only ever
 * read here, on the server -- it must never reach the browser bundle.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Thrown at startup of a send, so staff get a clear cause rather than a 500. */
export class EmailNotConfiguredError extends Error {
  constructor(missing: string) {
    super(
      `Email sending is not configured: ${missing} is not set. Set it with \`npx wrangler secret put ${missing}\`.`,
    );
    this.name = "EmailNotConfiguredError";
  }
}

export function assertEmailConfigured() {
  if (!env.RESEND_API_KEY) throw new EmailNotConfiguredError("RESEND_API_KEY");
  if (!env.INVITE_FROM_EMAIL) throw new EmailNotConfiguredError("INVITE_FROM_EMAIL");
}

export function isEmailConfigured() {
  return Boolean(env.RESEND_API_KEY && env.INVITE_FROM_EMAIL);
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  assertEmailConfigured();

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.INVITE_FROM_EMAIL,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });
  } catch (cause) {
    // Network failures are per-recipient, not fatal to a whole campaign.
    return { ok: false, error: cause instanceof Error ? cause.message : "Network error" };
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      error: `Resend responded ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    };
  }

  const body = (await response.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: body.id ?? "" };
}
