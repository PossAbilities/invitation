import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * An invitation campaign. One row per event a staff member builds.
 *
 * Dates are stored as the literal values the builder collects -- `eventDate` as
 * yyyy-mm-dd, `startTime`/`endTime` as hh:mm -- rather than as instants. An
 * invitation to "2pm on 18 September" means 2pm local time on the day, whatever
 * the guest's device thinks the offset is, and storing an epoch would make that
 * shift for anyone abroad.
 */
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    cardTitle: text("card_title").notNull(),
    cardHeader: text("card_header").notNull().default(""),
    message: text("message").notNull().default(""),
    eventDate: text("event_date").notNull(),
    startTime: text("start_time").notNull().default("09:00"),
    endTime: text("end_time").notNull().default(""),
    location: text("location").notNull().default(""),
    host: text("host").notNull().default(""),
    accent: text("accent").notNull().default("#ec008c"),
    logoVariant: text("logo_variant").notNull().default("stacked"),
    logoSize: text("logo_size").notNull().default("medium"),
    status: text("status", { enum: ["draft", "sending", "live", "archived"] })
      .notNull()
      .default("draft"),
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("events_status_idx").on(table.status)],
);

/**
 * A guest on an event's list.
 *
 * `token` is the guest's private invitation link. It is unique across every
 * event, unguessable, and is the only credential on the public /i/:token route,
 * so it is generated from crypto.getRandomValues -- never derived from the
 * email address or a counter.
 */
export const recipients = sqliteTable(
  "recipients",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    token: text("token").notNull(),
    status: text("status", {
      enum: ["staged", "invited", "opened", "going", "declined", "failed"],
    })
      .notNull()
      .default("staged"),
    /** Guest's own words when they respond. Never shown to other guests. */
    responseNote: text("response_note"),
    /** How many people they are bringing, themselves included. */
    partySize: integer("party_size"),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    openedAt: integer("opened_at", { mode: "timestamp_ms" }),
    respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
    /** Provider error text when a send fails, so staff can see why. */
    failureReason: text("failure_reason"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("recipients_token_idx").on(table.token),
    // One invitation per person per event: re-importing a spreadsheet must not
    // silently produce duplicate sends.
    uniqueIndex("recipients_event_email_idx").on(table.eventId, table.email),
    index("recipients_event_idx").on(table.eventId),
  ],
);

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type RecipientRow = typeof recipients.$inferSelect;
export type NewRecipientRow = typeof recipients.$inferInsert;
