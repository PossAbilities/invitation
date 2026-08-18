"use client";

import { type CSSProperties, useMemo, useState } from "react";

type InviteeStatus = "Going" | "Opened" | "Invited" | "Staged";
type ViewMode = "campaigns" | "builder" | "recipients" | "admin";
type BuilderStep = "design" | "recipients" | "send";

type Invitee = {
  name: string;
  email: string;
  status: InviteeStatus;
};

type Campaign = {
  title: string;
  date: string;
  status: string;
  guests: number;
  rsvps: number;
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

const navItems: Array<{ id: ViewMode; label: string }> = [
  { id: "campaigns", label: "Campaigns" },
  { id: "builder", label: "Create" },
  { id: "recipients", label: "Recipients" },
  { id: "admin", label: "Superuser" },
];

const builderSteps: Array<{ id: BuilderStep; label: string }> = [
  { id: "design", label: "Design" },
  { id: "recipients", label: "Recipients" },
  { id: "send", label: "Review" },
];

const adminMetrics = [
  { label: "Active users", value: "18" },
  { label: "Live events", value: "7" },
  { label: "Email queue", value: "1,248" },
  { label: "RSVP rate", value: "63%" },
];

const platformHealth = [
  { label: "Email service", value: "Healthy" },
  { label: "New accounts", value: "3 pending" },
  { label: "Data requests", value: "0 open" },
  { label: "Failed sends", value: "2 today" },
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

      const nameCell = cells.find(
        (cell) => cell !== email && !/^name$/i.test(cell) && !/^email$/i.test(cell)
      );

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
  const [activeView, setActiveView] = useState<ViewMode>("campaigns");
  const [activeStep, setActiveStep] = useState<BuilderStep>("design");
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
  const [importNotice, setImportNotice] = useState("2 rows ready");

  const responseSummary = useMemo(() => {
    const going = invitees.filter((guest) => guest.status === "Going").length;
    const opened = invitees.filter((guest) => guest.status === "Opened").length;
    const staged = invitees.filter((guest) => guest.status === "Staged").length;
    const invited = invitees.length;
    return { going, opened, invited, staged };
  }, [invitees]);

  const campaigns: Campaign[] = useMemo(
    () => [
      {
        title: eventName,
        date: eventDate,
        status: "Draft",
        guests: invitees.length,
        rsvps: responseSummary.going,
      },
      {
        title: "Big Tea Meet Up",
        date: "Tuesday 6 October 2026",
        status: "Sending",
        guests: 126,
        rsvps: 42,
      },
      {
        title: "Volunteer welcome morning",
        date: "Monday 19 October 2026",
        status: "Live",
        guests: 38,
        rsvps: 21,
      },
    ],
    [eventDate, eventName, invitees.length, responseSummary.going]
  );

  function showBuilder(step: BuilderStep = "design") {
    setActiveStep(step);
    setActiveView("builder");
  }

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
    setImportNotice(added ? "1 person added" : "That email is already listed");
    setNewGuestName("");
    setNewGuestEmail("");
  }

  function importBulkInvitees() {
    const parsed = parseInviteeRows(bulkInvitees);
    const { next, added } = mergeInvitees(invitees, parsed);

    setInvitees(next);
    setImportNotice(added ? `${added} people imported` : "No new email addresses found");
  }

  return (
    <main className="app-shell" style={{ "--accent": accent } as CSSProperties}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="app-topbar" aria-label="PossAbilities invitation platform">
        <div className="brand-lockup" aria-label="PossAbilities invitation studio">
          <img src="/brand/possabilities-wordmark.png" alt="PossAbilities" />
          <span>Invitations</span>
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              className={activeView === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="new-campaign-button" type="button" onClick={() => showBuilder()}>
          New invitation
        </button>
      </header>

      <section className="workspace" id="main-content">
        <div className="workspace-header">
          <div>
            <p className="section-kicker">Live The Life You Choose</p>
            <h1>
              {activeView === "campaigns" && "Invitation command centre"}
              {activeView === "builder" && "Create an invitation"}
              {activeView === "recipients" && "Manage invitation people"}
              {activeView === "admin" && "Superuser platform view"}
            </h1>
          </div>
          <div className="status-strip" aria-label="Campaign status summary">
            <span>{responseSummary.invited} listed</span>
            <span>{responseSummary.staged} staged</span>
            <span>{responseSummary.going} going</span>
          </div>
        </div>

        {activeView === "campaigns" && (
          <section className="campaign-shell" aria-label="Campaigns">
            <div className="campaign-focus">
              <div className="focus-copy">
                <p className="label-text">Next up</p>
                <h2>{eventName}</h2>
                <p>{eventDate} at {location}</p>
              </div>
              <div className="focus-actions">
                <button className="primary-action" type="button" onClick={() => showBuilder()}>
                  Continue draft
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => {
                    setActiveView("recipients");
                    setActiveStep("recipients");
                  }}
                >
                  Manage people
                </button>
              </div>
              <div className="campaign-progress" aria-label="Draft progress">
                <div>
                  <strong>Design</strong>
                  <span>Ready</span>
                </div>
                <div>
                  <strong>Guests</strong>
                  <span>{invitees.length} listed</span>
                </div>
                <div>
                  <strong>Review</strong>
                  <span>Draft</span>
                </div>
              </div>
            </div>

            <div className="campaign-list" aria-label="Active invitations">
              {campaigns.map((campaign) => (
                <article className="campaign-row" key={campaign.title}>
                  <div>
                    <span className="campaign-status">{campaign.status}</span>
                    <h3>{campaign.title}</h3>
                    <p>{campaign.date}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Guests</dt>
                      <dd>{campaign.guests}</dd>
                    </div>
                    <div>
                      <dt>RSVPs</dt>
                      <dd>{campaign.rsvps}</dd>
                    </div>
                  </dl>
                  <button type="button" onClick={() => showBuilder()}>
                    Open
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === "builder" && (
          <section className="builder-shell" aria-label="Invitation builder">
            <aside className="builder-rail" aria-label="Builder steps">
              {builderSteps.map((step, index) => (
                <button
                  className={activeStep === step.id ? "step-button active" : "step-button"}
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                >
                  <span>{index + 1}</span>
                  {step.label}
                </button>
              ))}
            </aside>

            <section className="builder-main">
              {activeStep === "design" && (
                <div className="builder-panel">
                  <div className="panel-title">
                    <p className="label-text">Design</p>
                    <h2>Event details and card style</h2>
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
                      <input
                        value={host}
                        onChange={(event) => setHost(event.target.value)}
                      />
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

                  <div className="form-actions">
                    <button
                      className="primary-action"
                      type="button"
                      onClick={() => setActiveStep("recipients")}
                    >
                      Next: recipients
                    </button>
                    <button className="text-action" type="button">
                      Save draft
                    </button>
                  </div>
                </div>
              )}

              {activeStep === "recipients" && (
                <PeopleManager
                  bulkInvitees={bulkInvitees}
                  importNotice={importNotice}
                  invitees={invitees}
                  newGuestEmail={newGuestEmail}
                  newGuestName={newGuestName}
                  onAdd={addSingleInvitee}
                  onBulkChange={(value) => {
                    setBulkInvitees(value);
                    setImportNotice(`${parseInviteeRows(value).length} rows ready`);
                  }}
                  onClearBulk={() => {
                    setBulkInvitees("");
                    setImportNotice("Paste or upload people to import");
                  }}
                  onEmailChange={setNewGuestEmail}
                  onFileText={(text) => {
                    setBulkInvitees(text);
                    setImportNotice(`${parseInviteeRows(text).length} rows ready`);
                  }}
                  onImport={importBulkInvitees}
                  onNameChange={setNewGuestName}
                />
              )}

              {activeStep === "send" && (
                <div className="builder-panel review-panel">
                  <div className="panel-title">
                    <p className="label-text">Review</p>
                    <h2>Ready to test-send</h2>
                  </div>
                  <div className="review-grid">
                    <article>
                      <strong>{eventName}</strong>
                      <span>{eventDate}</span>
                    </article>
                    <article>
                      <strong>{invitees.length}</strong>
                      <span>people in this campaign</span>
                    </article>
                    <article>
                      <strong>{responseSummary.staged}</strong>
                      <span>new people staged</span>
                    </article>
                  </div>
                  <div className="send-checklist">
                    <div>
                      <span className="check-mark" />
                      Invitation design saved
                    </div>
                    <div>
                      <span className="check-mark" />
                      Guest list checked
                    </div>
                    <div>
                      <span className="check-mark muted" />
                      Email sending provider pending
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="primary-action" type="button">
                      Send test email
                    </button>
                    <button className="secondary-action" type="button">
                      Schedule campaign
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="preview-dock" aria-label="Live invitation preview">
              <div className="preview-head">
                <div>
                  <p className="label-text">Recipient view</p>
                  <h2>Invitation preview</h2>
                </div>
                <button
                  className="secondary-action compact"
                  type="button"
                  onClick={() => setIsOpen((value) => !value)}
                  aria-pressed={isOpen}
                >
                  {isOpen ? "Close" : "Open"}
                </button>
              </div>
              <InvitePreview
                eventDate={eventDate}
                eventName={eventName}
                eventTime={eventTime}
                host={host}
                isOpen={isOpen}
                location={location}
                message={message}
                onToggle={() => setIsOpen((value) => !value)}
              />
            </aside>
          </section>
        )}

        {activeView === "recipients" && (
          <section className="standalone-grid" aria-label="Recipients">
            <PeopleManager
              bulkInvitees={bulkInvitees}
              importNotice={importNotice}
              invitees={invitees}
              newGuestEmail={newGuestEmail}
              newGuestName={newGuestName}
              onAdd={addSingleInvitee}
              onBulkChange={(value) => {
                setBulkInvitees(value);
                setImportNotice(`${parseInviteeRows(value).length} rows ready`);
              }}
              onClearBulk={() => {
                setBulkInvitees("");
                setImportNotice("Paste or upload people to import");
              }}
              onEmailChange={setNewGuestEmail}
              onFileText={(text) => {
                setBulkInvitees(text);
                setImportNotice(`${parseInviteeRows(text).length} rows ready`);
              }}
              onImport={importBulkInvitees}
              onNameChange={setNewGuestName}
            />
            <GuestList invitees={invitees} />
          </section>
        )}

        {activeView === "admin" && (
          <section className="admin-shell" aria-label="Superuser monitoring">
            <div className="admin-header">
              <div>
                <p className="label-text">Ryan - Superuser</p>
                <h2>Platform monitor</h2>
              </div>
              <button className="secondary-action" type="button">
                Export report
              </button>
            </div>
            <div className="admin-metrics">
              {adminMetrics.map((metric) => (
                <article key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>
            <div className="admin-grid">
              <section className="registration-panel" aria-label="User registration">
                <h3>User registration</h3>
                <div className="registration-fields">
                  <label>
                    <span>First name</span>
                    <input placeholder="Ryan" />
                  </label>
                  <label>
                    <span>Last name</span>
                    <input placeholder="Bott" />
                  </label>
                  <label>
                    <span>Work email</span>
                    <input placeholder="name@example.org" type="email" />
                  </label>
                  <label>
                    <span>Password</span>
                    <input placeholder="Minimum 12 characters" type="password" />
                  </label>
                </div>
                <label className="toggle-row">
                  <input type="checkbox" defaultChecked />
                  <span>Require superuser approval</span>
                </label>
                <button className="primary-action" type="button">
                  Create account
                </button>
              </section>

              <section className="monitor-panel" aria-label="Platform health">
                <h3>Platform health</h3>
                <div className="monitor-feed">
                  {platformHealth.map((item) => (
                    <article key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function PeopleManager({
  bulkInvitees,
  importNotice,
  invitees,
  newGuestEmail,
  newGuestName,
  onAdd,
  onBulkChange,
  onClearBulk,
  onEmailChange,
  onFileText,
  onImport,
  onNameChange,
}: {
  bulkInvitees: string;
  importNotice: string;
  invitees: Invitee[];
  newGuestEmail: string;
  newGuestName: string;
  onAdd: () => void;
  onBulkChange: (value: string) => void;
  onClearBulk: () => void;
  onEmailChange: (value: string) => void;
  onFileText: (value: string) => void;
  onImport: () => void;
  onNameChange: (value: string) => void;
}) {
  return (
    <section className="people-manager" aria-label="Invitation recipients">
      <div className="panel-title split">
        <div>
          <p className="label-text">Recipients</p>
          <h2>Build the invitation list</h2>
        </div>
        <div className="count-chip">{invitees.length} listed</div>
      </div>

      <div className="people-layout">
        <div className="single-add">
          <label>
            <span>Name</span>
            <input
              value={newGuestName}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Morgan Price"
            />
          </label>
          <label>
            <span>Email</span>
            <input
              value={newGuestEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="morgan.price@example.org"
              type="email"
            />
          </label>
          <button className="primary-action" type="button" onClick={onAdd}>
            Add person
          </button>
        </div>

        <div className="bulk-add">
          <label>
            <span>Spreadsheet rows</span>
            <textarea
              value={bulkInvitees}
              onChange={(event) => onBulkChange(event.target.value)}
              rows={6}
            />
          </label>
          <div className="bulk-actions">
            <label className="file-import">
              <span>CSV file</span>
              <input
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file) {
                    return;
                  }

                  void file.text().then(onFileText);
                }}
                type="file"
              />
            </label>
            <button className="secondary-action" type="button" onClick={onImport}>
              Import
            </button>
            <button className="text-action" type="button" onClick={onClearBulk}>
              Clear
            </button>
          </div>
          <p className="import-notice" role="status">
            {importNotice}
          </p>
        </div>
      </div>
    </section>
  );
}

function GuestList({ invitees }: { invitees: Invitee[] }) {
  return (
    <section className="guest-list-panel" aria-label="Current invitation list">
      <div className="panel-title">
        <p className="label-text">Current list</p>
        <h2>People on this invitation</h2>
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
    </section>
  );
}

function InvitePreview({
  eventDate,
  eventName,
  eventTime,
  host,
  isOpen,
  location,
  message,
  onToggle,
}: {
  eventDate: string;
  eventName: string;
  eventTime: string;
  host: string;
  isOpen: boolean;
  location: string;
  message: string;
  onToggle: () => void;
}) {
  return (
    <div className={isOpen ? "invite-stage open" : "invite-stage"}>
      <div className="mail-shadow" />
      <div className="invite-card" aria-hidden={!isOpen} aria-label="Invitation card preview">
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
        onClick={onToggle}
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
  );
}
