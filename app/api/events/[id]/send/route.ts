import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { events } from "@/db/schema";
import { getStaffUser } from "@/lib/auth";
import { EmailNotConfiguredError, isEmailConfigured } from "@/lib/email";
import { sendInvitations } from "@/lib/invitations";

type Context = { params: Promise<{ id: string }> };

/** Sends the campaign to everyone on the event's list who has not been sent it. */
export async function POST(_request: Request, { params }: Context) {
  const user = await getStaffUser();
  if (!user) return Response.json({ error: "Not authorised" }, { status: 403 });

  if (!isEmailConfigured()) {
    return Response.json(
      {
        error:
          "Email sending is not set up yet. Add the RESEND_API_KEY and INVITE_FROM_EMAIL secrets, then try again.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;

  try {
    const summary = await sendInvitations(id);
    const db = getDb();

    // Only claim the campaign is live if at least one invitation actually left.
    await db
      .update(events)
      .set({ status: summary.sent > 0 ? "live" : "draft", updatedAt: new Date() })
      .where(eq(events.id, id));

    return Response.json(summary);
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Sending failed" },
      { status: 500 },
    );
  }
}
