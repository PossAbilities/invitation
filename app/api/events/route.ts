import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { events } from "@/db/schema";
import { getStaffUser } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { addRecipients } from "@/lib/invitations";

/**
 * Saves the builder's current state as an event, with its guest list.
 *
 * Middleware already refuses non-staff requests; the check here is deliberate
 * duplication, so that a future change to the matcher cannot quietly expose
 * writes to the public.
 */
export async function POST(request: Request) {
  const user = await getStaffUser();
  if (!user) return Response.json({ error: "Not authorised" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const text = (key: string, fallback = "") => {
    const value = body[key];
    return typeof value === "string" ? value.slice(0, 2000) : fallback;
  };

  const name = text("name").trim();
  const eventDate = text("eventDate").trim();

  if (!name) return Response.json({ error: "The event needs a name." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return Response.json({ error: "The event needs a valid date." }, { status: 400 });
  }

  const people = Array.isArray(body.recipients)
    ? (body.recipients as Array<Record<string, unknown>>)
        .map((person) => ({
          name: typeof person.name === "string" ? person.name : "",
          email: typeof person.email === "string" ? person.email : "",
        }))
        .filter((person) => person.email.includes("@"))
    : [];

  const db = getDb();
  const now = new Date();
  const existingId = text("id").trim();

  const values = {
    name,
    cardTitle: text("cardTitle") || name,
    cardHeader: text("cardHeader"),
    message: text("message"),
    eventDate,
    startTime: text("startTime", "09:00"),
    endTime: text("endTime"),
    location: text("location"),
    host: text("host"),
    accent: text("accent", "#ec008c"),
    logoVariant: text("logoVariant", "stacked"),
    logoSize: text("logoSize", "medium"),
    updatedAt: now,
  };

  let eventId = existingId;

  if (existingId) {
    const updated = await db
      .update(events)
      .set(values)
      .where(eq(events.id, existingId))
      .returning({ id: events.id });

    if (updated.length === 0) {
      return Response.json({ error: "That invitation no longer exists." }, { status: 404 });
    }
  } else {
    eventId = createId("evt");
    await db.insert(events).values({
      ...values,
      id: eventId,
      status: "draft",
      createdBy: user.email,
      createdAt: now,
    });
  }

  const { added } = await addRecipients(eventId, people);

  return Response.json({ id: eventId, recipientsAdded: added });
}
