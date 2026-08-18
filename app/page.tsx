"use client";

import { type CSSProperties, useMemo, useState } from "react";

type InviteeStatus = "Going" | "Opened" | "Invited" | "Staged";

type Invitee = {
  name: string;
  email: string;
  status: InviteeStatus;
};

const initialInvitees: Invitee[] = [
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

const statusTone: Record<InviteeStatus, string> = {
  Going: "status-going",
  Opened: "status-opened",
  Invited: "status-invited",
  Staged: "status-staged",
};

const superuserMetrics = [
  { label: "Users", value: "18" },
  { label: "Events", value: "7" },
  { label: "Queued", value: "1,248" },
  { label: "RSVPs", value: "63%" },
];

const monitorItems = [
  { label: "Email queue", value: "Healthy" },
  { label: "New accounts", value: "3 pending" },
  { label: "Data requests", value: "0 open" },
];

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function cleanCell(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function nameFromEmail(email: string) {
  const prefix = email.split("@")[0] ?? "Guest";
  return prefix
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseInviteeRows(raw: string): Invitee[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes("\t") ? /\t+/ : /[,;]+/;
      const cells = line.split(separator).map(cleanCell).filter(Boolean);
      const email = cells.find(isEmail);

      if (!email) {
        return null;
      }

      const nameCell = cells.find((cell) => cell !== email && !/^email$/i.test(cell));

      return {
        name: nameCell ?? nameFromEmail(email),
        email,
        status: "Staged" as const,
      };
    })
    .filter((invitee): invitee is Invitee => Boolean(invitee));
}

function mergeInvitees(current: Invitee[], incoming: Invitee[]) {
  const seen = new Set(current.map((invitee) => invitee.email.toLowerCase()));
  const fresh = incoming.filter((invitee) => {
    const key = invitee.email.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return { next: [...fresh, ...current], added: fresh.length };
}

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
  const [invitees, setInvitees] = useState<Invitee[]>(initialInvitees);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [bulkInvitees, setBulkInvitees] = useState(
    "Morgan Price,morgan.price@example.org\nJamie Carter,jamie.carter@example.org"
  );
  const [importNotice, setImportNotice] = useState("2 rows ready to import");

  const responseSummary = useMemo(() => {
    const going = invitees.filter((guest) => guest.status === "Going").length;
    const opened = invitees.filter((guest) => guest.status === "Opened").length;
    const staged = invitees.filter((guest) => guest.status === "Staged").length;
    const invited = invitees.length;
    return { going, opened, invited, staged };
  }, [invitees]);

  function addSingleInvitee() {
    if (!isEmail(newGuestEmail)) {
      setImportNotice("Enter a valid email address");
      return;
    }

    const guest = {
      name: newGuestName.trim() || nameFromEmail(newGuestEmail),
      email: newGuestEmail.trim(),
      status: "Staged" as const,
    };
    const { next, added } = mergeInvitees(invitees, [guest]);

    setInvitees(next);
    setImportNotice(added ? "1 person added to the invitation list" : "That email is already listed");
    setNewGuestName("");
    setNewGuestEmail("");
  }

  function importBulkInvitees() {
    const parsed = parseInviteeRows(bulkInvitees);
    const { next, added } = mergeInvitees(invitees, parsed);

    setInvitees(next);
    setImportNotice(
      added
        ? `${added} people imported to the invitation list`
        : "No new email addresses found"
    );
  }

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
              <div
                className="invite-card"
                aria-hidden={!isOpen}
                aria-label="Invitation card preview"
              >
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
                  <button disabled={!isOpen} type="button">
                    Going
                  </button>
                  <button disabled={!isOpen} type="button">
                    Maybe
                  </button>
                </div>
              </div>
              <button
                className="envelope"
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-label={isOpen ? "Close invitation envelope" : "Open invitation envelope"}
                title={isOpen ? "Close envelope" : "Open envelope"}
              >
                <span className="envelope-back" />
                <span className="envelope-paper">
                  <span>You are invited</span>
                  <strong>{host}</strong>
                </span>
                <span className="envelope-front" />
                <span className="envelope-flap" />
                <span className="wax-seal">P</span>
              </button>
            </div>
          </div>
        </section>

        <section className="people-grid" aria-label="Audience and access management">
          <div className="panel people-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">People</span>
                <h2>Add invitation recipients</h2>
              </div>
              <div className="count-pill">{invitees.length} listed</div>
            </div>

            <div className="people-tools">
              <div className="single-add">
                <label>
                  <span>Name</span>
                  <input
                    value={newGuestName}
                    onChange={(event) => setNewGuestName(event.target.value)}
                    placeholder="Morgan Price"
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    value={newGuestEmail}
                    onChange={(event) => setNewGuestEmail(event.target.value)}
                    placeholder="morgan.price@example.org"
                    type="email"
                  />
                </label>
                <button className="primary-action" type="button" onClick={addSingleInvitee}>
                  Add person
                </button>
              </div>

              <div className="bulk-add">
                <label className="bulk-field">
                  <span>Paste spreadsheet rows</span>
                  <textarea
                    value={bulkInvitees}
                    onChange={(event) => {
                      setBulkInvitees(event.target.value);
                      setImportNotice(
                        `${parseInviteeRows(event.target.value).length} rows ready to import`
                      );
                    }}
                    rows={5}
                  />
                </label>
                <div className="bulk-actions">
                  <label className="file-import">
                    <span>Upload CSV</span>
                    <input
                      accept=".csv,.txt,text/csv,text/plain"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (!file) {
                          return;
                        }

                        void file.text().then((text) => {
                          setBulkInvitees(text);
                          setImportNotice(
                            `${parseInviteeRows(text).length} rows ready to import`
                          );
                        });
                      }}
                      type="file"
                    />
                  </label>
                  <button className="secondary-action" type="button" onClick={importBulkInvitees}>
                    Import list
                  </button>
                  <button
                    className="ghost-action"
                    type="button"
                    onClick={() => {
                      setBulkInvitees("");
                      setImportNotice("Paste or upload people to import");
                    }}
                  >
                    Clear
                  </button>
                </div>
                <p className="import-notice" role="status">
                  {importNotice}
                </p>
              </div>
            </div>
          </div>

          <div className="panel access-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">Access</span>
                <h2>Registration and superuser view</h2>
              </div>
              <div className="superuser-badge">Ryan - Superuser</div>
            </div>

            <div className="access-grid">
              <div className="registration-flow">
                <h3>User registration</h3>
                <div className="registration-fields">
                  <input placeholder="First name" aria-label="First name" />
                  <input placeholder="Last name" aria-label="Last name" />
                  <input placeholder="Work email" aria-label="Work email" type="email" />
                  <input placeholder="Password" aria-label="Password" type="password" />
                </div>
                <label className="toggle-row">
                  <input type="checkbox" defaultChecked />
                  <span>Require superuser approval</span>
                </label>
                <button className="primary-action" type="button">
                  Create account
                </button>
              </div>

              <div className="superuser-monitor">
                <h3>Platform monitor</h3>
                <div className="admin-metrics">
                  {superuserMetrics.map((metric) => (
                    <div key={metric.label}>
                      <strong>{metric.value}</strong>
                      <span>{metric.label}</span>
                    </div>
                  ))}
                </div>
                <div className="monitor-feed">
                  {monitorItems.map((item) => (
                    <article key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
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
              {invitees.map((guest) => (
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
              <p>
                Users, roles, events, invite links, imported recipients, RSVP choices,
                consent, and audit history.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
