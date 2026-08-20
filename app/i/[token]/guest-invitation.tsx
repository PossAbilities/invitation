"use client";

import { type CSSProperties, useActionState, useState } from "react";

import { createCalendarHref, createMapsHref, slugify } from "@/lib/event-format";

import { submitRsvp, type RsvpState } from "./actions";

type Props = {
  accent: string;
  cardHeader: string;
  cardTitle: string;
  endTime: string;
  eventDate: string;
  eventDateLabel: string;
  eventName: string;
  eventTimeLabel: string;
  host: string;
  initialNote: string | null;
  initialPartySize: number | null;
  initialResponse: "going" | "declined" | null;
  location: string;
  logoSize: string;
  logoVariant: string;
  message: string;
  recipientName: string;
  startTime: string;
  token: string;
};

export function GuestInvitation(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<RsvpState, FormData>(submitRsvp, {
    status: props.initialResponse ? "saved" : "idle",
    message: props.initialResponse === "going" ? "You are down as coming." : "",
    response: props.initialResponse,
  });

  const calendarHref = createCalendarHref({
    endTime: props.endTime,
    eventDate: props.eventDate,
    eventName: props.eventName,
    host: props.host,
    location: props.location,
    message: props.message,
    startTime: props.startTime,
  });

  const logoSrc =
    props.logoVariant === "wordmark"
      ? "/brand/possabilities-wordmark.png"
      : "/brand/possabilities-stacked.png";

  return (
    <main className="guest-shell" style={{ "--accent": props.accent } as CSSProperties}>
      <a className="skip-link" href="#invitation">
        Skip to your invitation
      </a>

      <div className={isOpen ? "invite-stage open" : "invite-stage"} id="invitation">
        <div className="mail-shadow" />

        <div
          aria-label="Invitation card"
          className="invite-card"
          inert={!isOpen}
        >
          <div className="invite-card-shell">
            <div className="invite-card-header">
              {props.logoVariant !== "none" && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  alt="PossAbilities"
                  className={`invite-logo ${props.logoVariant} ${props.logoSize}`}
                  src={logoSrc}
                />
              )}
              {props.cardHeader && <span className="invite-tag">{props.cardHeader}</span>}
              <h1>{props.cardTitle}</h1>
              <p>{props.message}</p>
            </div>

            <div className="invite-detail-panel">
              <dl>
                <div className="event-detail">
                  <dt>Date</dt>
                  <dd>
                    <strong>{props.eventDateLabel}</strong>
                    <span>{props.eventTimeLabel}</span>
                    {calendarHref && (
                      <span className="detail-links">
                        <a download={`${slugify(props.eventName)}.ics`} href={calendarHref}>
                          Add to calendar
                        </a>
                      </span>
                    )}
                  </dd>
                </div>
                {props.location && (
                  <div className="event-detail">
                    <dt>Place</dt>
                    <dd>
                      <strong>{props.location}</strong>
                      {props.host && <span>Hosted by {props.host}</span>}
                      <span className="detail-links">
                        <a
                          href={createMapsHref(props.location)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View map
                        </a>
                      </span>
                    </dd>
                  </div>
                )}
              </dl>

              <form action={formAction} className="rsvp-form">
                <input name="token" type="hidden" value={props.token} />

                <fieldset>
                  <legend>Can you come?</legend>
                  <div className="rsvp-choices">
                    <label>
                      <input
                        defaultChecked={state.response === "going"}
                        name="response"
                        type="radio"
                        value="going"
                      />
                      <span>Yes, I can come</span>
                    </label>
                    <label>
                      <input
                        defaultChecked={state.response === "declined"}
                        name="response"
                        type="radio"
                        value="declined"
                      />
                      <span>Sorry, I cannot</span>
                    </label>
                  </div>
                </fieldset>

                <label className="rsvp-field">
                  <span>How many people, including you?</span>
                  <input
                    defaultValue={props.initialPartySize ?? ""}
                    inputMode="numeric"
                    max={20}
                    min={1}
                    name="partySize"
                    type="number"
                  />
                </label>

                <label className="rsvp-field">
                  <span>Anything we should know? (optional)</span>
                  <textarea
                    defaultValue={props.initialNote ?? ""}
                    name="note"
                    placeholder="Access needs, dietary requirements, or anything else"
                    rows={3}
                  />
                </label>

                <button disabled={isPending} type="submit">
                  {isPending ? "Sending your reply..." : "Send my reply"}
                </button>

                {state.message && (
                  <p
                    className={state.status === "error" ? "rsvp-message error" : "rsvp-message"}
                    role="status"
                  >
                    {state.message}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>

        <button
          aria-label={isOpen ? "Close invitation envelope" : "Open invitation envelope"}
          className="envelope"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          <span className="envelope-back">
            <span className="envelope-postmark" aria-hidden="true" />
            <span className="envelope-stamp" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src="/brand/possabilities-stacked.png" />
            </span>
          </span>
          <span className="envelope-paper">
            <span>You are invited</span>
            <strong>{props.host}</strong>
          </span>
          <span className="envelope-front">
            <span className="envelope-recipient">{props.recipientName}</span>
          </span>
          <span className="envelope-flap" />
          <span className="wax-seal" aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
