import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { events, recipients, type EventRow, type RecipientRow } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { formatEventDate, formatEventTime } from "@/lib/event-format";
import { createId, createInviteToken } from "@/lib/ids";

export type InvitationDetail = {
  event: EventRow;
  recipient: RecipientRow;
};

export type GuestResponse = "going" | "declined";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appOrigin() {
  return (env.APP_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
}

export function inviteUrl(token: string) {
  return `${appOrigin()}/i/${token}`;
}

/** Loads a guest's invitation by their private token. */
export async function getInvitationByToken(token: string): Promise<InvitationDetail | null> {
  const db = getDb();
  const rows = await db
    .select({ event: events, recipient: recipients })
    .from(recipients)
    .innerJoin(events, eq(events.id, recipients.eventId))
    .where(eq(recipients.token, token))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Records that the guest opened their invitation.
 *
 * Only ever moves a recipient forward from "invited": a guest who has already
 * replied must not be knocked back to "opened" by revisiting the link.
 */
export async function markInvitationOpened(recipient: RecipientRow) {
  if (recipient.status !== "invited") return;

  const db = getDb();
  await db
    .update(recipients)
    .set({ status: "opened", openedAt: new Date() })
    .where(and(eq(recipients.id, recipient.id), eq(recipients.status, "invited")));
}

/** Records a guest's RSVP. Guests may change their mind, so this is not one-shot. */
export async function recordResponse(
  token: string,
  response: GuestResponse,
  options: { partySize?: number | null; note?: string | null } = {},
) {
  const db = getDb();
  const result = await db
    .update(recipients)
    .set({
      status: response,
      respondedAt: new Date(),
      partySize: options.partySize ?? null,
      responseNote: options.note?.slice(0, 2000) ?? null,
    })
    .where(eq(recipients.token, token))
    .returning({ id: recipients.id });

  return result.length > 0;
}

/** Adds guests to an event, skipping anyone already on the list. */
export async function addRecipients(
  eventId: string,
  people: Array<{ name: string; email: string }>,
) {
  if (people.length === 0) return { added: 0 };

  const db = getDb();
  const now = new Date();
  const rows = people.map((person) => ({
    id: createId("rcp"),
    eventId,
    name: person.name.trim().slice(0, 200),
    email: person.email.trim().toLowerCase().slice(0, 320),
    token: createInviteToken(),
    status: "staged" as const,
    createdAt: now,
  }));

  // The (event_id, email) unique index is what actually enforces this; the
  // conflict clause turns a re-imported spreadsheet into a no-op rather than an
  // error, which is the behaviour staff expect.
  const inserted = await db
    .insert(recipients)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: recipients.id });

  return { added: inserted.length };
}

function renderInviteEmail(event: EventRow, recipient: RecipientRow) {
  const url = inviteUrl(recipient.token);
  const dateLabel = formatEventDate(event.eventDate);
  const timeLabel = formatEventTime(event.startTime, event.endTime);
  const firstName = recipient.name.split(" ")[0] || "there";

  const subject = `You're invited: ${event.name}`;

  const text = [
    `Hello ${firstName},`,
    "",
    event.message,
    "",
    `${event.name}`,
    `${dateLabel}${timeLabel ? `, ${timeLabel}` : ""}`,
    event.location ? `Where: ${event.location}` : "",
    event.host ? `Hosted by ${event.host}` : "",
    "",
    "Open your invitation and let us know if you can make it:",
    url,
  ]
    .filter(Boolean)
    .join("\n");

  // Deliberately plain, table-free and inline-styled: invitation mail has to
  // survive Outlook and Gmail, and this renders the same in both. The animated
  // envelope lives on the web page the button opens.
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f8f8;font-family:Arial,Helvetica,sans-serif;color:#231f20;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <p style="margin:0 0 18px;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:#c40074;">
        ${escapeHtml(event.cardHeader || "You are invited")}
      </p>
      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#48065a;">
        ${escapeHtml(event.cardTitle || event.name)}
      </h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.55;">Hello ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.55;">${escapeHtml(event.message)}</p>
      <div style="margin:0 0 26px;padding:18px;background:#eefafa;border-radius:12px;font-size:15px;line-height:1.6;">
        <strong style="display:block;color:#48065a;">${escapeHtml(dateLabel)}</strong>
        ${timeLabel ? `<span>${escapeHtml(timeLabel)}</span><br />` : ""}
        ${event.location ? `<span>${escapeHtml(event.location)}</span><br />` : ""}
        ${event.host ? `<span style="color:#5b5f66;">Hosted by ${escapeHtml(event.host)}</span>` : ""}
      </div>
      <a href="${url}"
         style="display:inline-block;padding:14px 30px;border-radius:999px;background:#48065a;color:#ffffff;font-weight:bold;font-size:16px;text-decoration:none;">
        Open your invitation
      </a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#5b5f66;">
        If the button does not work, copy this link into your browser:<br />
        <span style="word-break:break-all;">${url}</span>
      </p>
    </div>
  </body>
</html>`;

  return { subject, html, text };
}

export type SendSummary = {
  sent: number;
  failed: number;
  failures: Array<{ email: string; error: string }>;
};

/**
 * Sends invitations for an event.
 *
 * Recipients are sent one at a time and each result is written back before the
 * next attempt, so a failure part-way through leaves an accurate record of who
 * actually received an email rather than losing the whole batch.
 */
export async function sendInvitations(
  eventId: string,
  options: { recipientIds?: string[] } = {},
): Promise<SendSummary> {
  const db = getDb();

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) throw new Error("Event not found");

  const where = options.recipientIds?.length
    ? and(eq(recipients.eventId, eventId), inArray(recipients.id, options.recipientIds))
    : eq(recipients.eventId, eventId);

  const list = await db.select().from(recipients).where(where);

  const summary: SendSummary = { sent: 0, failed: 0, failures: [] };

  for (const recipient of list) {
    const message = renderInviteEmail(event, recipient);
    const result = await sendEmail({ to: recipient.email, ...message });

    if (result.ok) {
      summary.sent += 1;
      await db
        .update(recipients)
        .set({ status: "invited", sentAt: new Date(), failureReason: null })
        .where(eq(recipients.id, recipient.id));
    } else {
      summary.failed += 1;
      summary.failures.push({ email: recipient.email, error: result.error });
      await db
        .update(recipients)
        .set({ status: "failed", failureReason: result.error.slice(0, 500) })
        .where(eq(recipients.id, recipient.id));
    }
  }

  return summary;
}

/** Sends a single preview to a staff address without touching guest records. */
export async function sendTestEmail(eventId: string, to: string) {
  const db = getDb();
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) throw new Error("Event not found");

  const sample: RecipientRow = {
    id: "preview",
    eventId,
    name: "Preview Recipient",
    email: to,
    // A throwaway token: the preview link must not expose a real guest's
    // invitation, and must not resolve to anything in the database.
    token: createInviteToken(),
    status: "staged",
    responseNote: null,
    partySize: null,
    sentAt: null,
    openedAt: null,
    respondedAt: null,
    failureReason: null,
    createdAt: new Date(),
  };

  const message = renderInviteEmail(event, sample);
  return sendEmail({ to, ...message });
}
