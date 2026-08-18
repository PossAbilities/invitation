"use client";

import { type CSSProperties, useMemo, useState } from "react";

const guests = [
  {
    name: "Amelia Hughes",
    email: "amelia.hughes@example.org",
    status: "Going",
  },
  {
    name: "Sam Taylor",
    email: "sam.taylor@example.org",
    status: "Opened",
  },
  {
    name: "Priya Shah",
    email: "priya.shah@example.org",
    status: "Invited",
  },
  {
    name: "Jordan Lee",
    email: "jordan.lee@example.org",
    status: "Going",
  },
];

const palette = [
  { name: "PossAbilities pink", value: "#ec008c" },
  { name: "Brand teal", value: "#66cccc" },
  { name: "Deep purple", value: "#48065a" },
];

const statusTone: Record<string, string> = {
  Going: "status-going",
  Opened: "status-opened",
  Invited: "status-invited",
};

export default function Home() {
  const [eventName, setEventName] = useState("Summer PossAbilities Social");
  const [eventDate, setEventDate] = useState("Friday 18 September 2026");
  const [eventTime, setEventTime] = useState("2:00 PM - 5:30 PM");
  const [location, setLocation] = useState("The Social Lounge, Rochdale");
  const [host, setHost] = useState("PossAbilities CIC");
  const [message, setMessage] = useState(
    "Join us for music, food, games, and a relaxed afternoon celebrating people living the life they choose."
  );
  const [accent, setAccent] = useState(palette[0].value);
  const [isOpen, setIsOpen] = useState(false);

  const responseSummary = useMemo(() => {
    const going = guests.filter((guest) => guest.status === "Going").length;
    const opened = guests.filter((guest) => guest.status === "Opened").length;
    const invited = guests.length;
    return { going, opened, invited };
  }, []);

  return (
    <main className="app-shell" style={{ "--accent": accent } as CSSProperties}>
      <section className="workspace">
        <header className="topbar" aria-label="PossAbilities invitations">
          <div className="brand-lockup" aria-label="PossAbilities invitation studio">
            <img src="/brand/possabilities-wordmark.png" alt="PossAbilities" />
            <span>Invitations</span>
          </div>
          <div className="campaign-state">
            <span className="live-dot" />
            Draft campaign
          </div>
        </header>

        <section className="hero-grid" aria-label="Invitation campaign builder">
          <div className="builder panel">
            <div className="panel-heading">
              <span className="eyebrow">Create</span>
              <h1>Design a hosted invite that feels unmistakably PossAbilities.</h1>
            </div>

            <div className="form-grid">
              <label>
                <span>Event name</span>
                <input
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
                />
              </label>
              <label>
                <span>Date</span>
                <input
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                />
              </label>
              <label>
                <span>Time</span>
                <input
                  value={eventTime}
                  onChange={(event) => setEventTime(event.target.value)}
                />
              </label>
              <label>
                <span>Place</span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>
              <label>
                <span>Host</span>
                <input value={host} onChange={(event) => setHost(event.target.value)} />
              </label>
            </div>

            <label className="message-field">
              <span>Invite message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
              />
            </label>

            <fieldset className="palette-field">
              <legend>Card accent</legend>
              <div className="swatches">
                {palette.map((color) => (
                  <button
                    className={accent === color.value ? "swatch selected" : "swatch"}
                    key={color.value}
                    onClick={() => setAccent(color.value)}
                    style={{ backgroundColor: color.value }}
                    type="button"
                    aria-label={color.name}
                    title={color.name}
                  />
                ))}
              </div>
            </fieldset>

            <div className="actions">
              <button className="primary-action" type="button">
                Save campaign
              </button>
              <button className="secondary-action" type="button">
                Send test email
              </button>
            </div>
          </div>

          <div className="preview-panel panel">
            <div className="preview-heading">
              <div>
                <span className="eyebrow">Recipient view</span>
                <h2>Animated invite preview</h2>
              </div>
              <button
                className="icon-command"
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-pressed={isOpen}
                title={isOpen ? "Close envelope" : "Open envelope"}
              >
                {isOpen ? "Close" : "Open"}
              </button>
            </div>

            <div className={isOpen ? "invite-stage open" : "invite-stage"}>
              <div className="mail-shadow" />
              <div className="invite-card" aria-label="Invitation card preview">
                <img src="/brand/possabilities-stacked.png" alt="" />
                <span className="invite-tag">Live The Life You Choose</span>
                <h3>{eventName}</h3>
                <p>{message}</p>
                <dl>
                  <div>
                    <dt>Date</dt>
                    <dd>{eventDate}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>{eventTime}</dd>
                  </div>
                  <div>
                    <dt>Place</dt>
                    <dd>{location}</dd>
                  </div>
                </dl>
                <div className="rsvp-row" aria-label="RSVP actions">
                  <button type="button">Going</button>
                  <button type="button">Maybe</button>
                </div>
              </div>
              <div className="envelope">
                <div className="envelope-back" />
                <div className="envelope-paper">
                  <span>You are invited</span>
                  <strong>{host}</strong>
                </div>
                <div className="envelope-front" />
                <div className="envelope-flap" />
                <div className="wax-seal">P</div>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-grid" aria-label="Campaign management">
          <div className="panel guest-panel">
            <div className="panel-heading compact">
              <span className="eyebrow">Guests</span>
              <h2>Invite list</h2>
            </div>
            <div className="guest-list">
              {guests.map((guest) => (
                <article className="guest-row" key={guest.email}>
                  <div>
                    <h3>{guest.name}</h3>
                    <p>{guest.email}</p>
                  </div>
                  <span className={statusTone[guest.status]}>{guest.status}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="panel email-panel">
            <div className="panel-heading compact">
              <span className="eyebrow">Email</span>
              <h2>Inbox preview</h2>
            </div>
            <div className="email-preview">
              <div className="email-browser">
                <span />
                <span />
                <span />
              </div>
              <div className="email-content">
                <p className="email-subject">You are invited: {eventName}</p>
                <div className="email-envelope">
                  <span className="email-flap" />
                  <span className="email-seal">P</span>
                </div>
                <h3>{eventName}</h3>
                <p>{eventDate} at {location}</p>
                <button type="button">Open invitation</button>
              </div>
            </div>
          </div>

          <div className="panel stats-panel">
            <div className="panel-heading compact">
              <span className="eyebrow">Responses</span>
              <h2>Campaign pulse</h2>
            </div>
            <div className="stats">
              <div>
                <strong>{responseSummary.invited}</strong>
                <span>Invited</span>
              </div>
              <div>
                <strong>{responseSummary.opened}</strong>
                <span>Opened</span>
              </div>
              <div>
                <strong>{responseSummary.going}</strong>
                <span>Going</span>
              </div>
            </div>
            <div className="data-note">
              <strong>Data model</strong>
              <p>Users, events, invite links, RSVP choices, consent, and audit history.</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
