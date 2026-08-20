# PossAbilities Invitations

A branded invitation tool: staff build an invitation, import a guest list, and
send each person a private link to an animated envelope they open to reveal the
card and RSVP.

Runs on Cloudflare Workers ([vinext](https://github.com/cloudflare/vinext), which
is the Next.js App Router on Vite), with D1 for storage and Resend for email.

---

## How it fits together

| Piece | Where | Notes |
| --- | --- | --- |
| Staff builder | `app/page.tsx` | Behind Cloudflare Access |
| Guest invitation | `app/i/[token]/` | Public — the link recipients receive |
| Access control | `middleware.ts`, `lib/auth.ts` | Everything is staff-only except `/i/:token` |
| Data | `db/schema.ts`, `drizzle/` | Events and recipients in D1 |
| Email | `lib/email.ts`, `lib/invitations.ts` | Resend, behind a swappable interface |

Each guest gets a 120-bit random token. That token is the only credential on
their invitation page, which is why those pages are marked `noindex` and why
tokens are never derived from an email address.

---

## Running it locally

```bash
npm install
npm run db:migrate:local     # creates the local D1 tables
npm run dev                  # http://localhost:3000
```

Cloudflare Access is not in front of the local server, so the staff area opens
without a login. That bypass is compiled out of production builds — it is guarded
by `import.meta.env.DEV`, which Vite replaces with a literal `false`, so the
branch does not exist in the deployed bundle.

To see a guest invitation locally, insert a row and visit `/i/<token>`:

```bash
npx wrangler d1 execute possabilities-invitations --local --command \
  "SELECT token FROM recipients LIMIT 1"
```

### Checks

```bash
npm run typecheck
npm run lint
npm test          # builds, then runs against the real Workers runtime
```

---

## Deploying to invitation.possabilities.org.uk

You need a Cloudflare account. `possabilities.org.uk` currently has its DNS
elsewhere, which is fine — step 5 covers it.

### 1. Create the database

```bash
npx wrangler d1 create possabilities-invitations
```

Paste the `database_id` it prints into `wrangler.jsonc`, replacing the
placeholder zeros, then apply the schema:

```bash
npm run db:migrate
```

### 2. Set up Resend

1. Sign up at [resend.com](https://resend.com) and add `possabilities.org.uk` as a domain.
2. Add the DKIM and SPF records it gives you to wherever your DNS lives.
3. Wait for it to verify — usually minutes, occasionally hours.
4. Create an API key with send permission.

Sending from an unverified domain will either fail outright or land in spam, so
do not skip the verification.

### 3. Set the secrets

These are never committed. Set each one:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put INVITE_FROM_EMAIL     # e.g. invitations@possabilities.org.uk
npx wrangler secret put ACCESS_TEAM_DOMAIN    # e.g. possabilities.cloudflareaccess.com
npx wrangler secret put ACCESS_AUD            # from step 4
```

### 4. Set up Cloudflare Access

In the Cloudflare dashboard, under **Zero Trust → Access → Applications**, add a
self-hosted application:

- **Domain**: `invitation.possabilities.org.uk`
- **Path**: leave blank to cover the whole site
- **Policy**: allow the staff email addresses, or your whole email domain
- Add a second policy that **bypasses** Access for the path `/i/*`

That last policy matters. Without it guests hit a login screen instead of their
invitation. The application belongs at the root rather than on each staff path so
that a new staff page is protected the moment it exists.

Copy the **Application Audience (AUD) tag** from the application's overview into
the `ACCESS_AUD` secret above.

Adding or removing staff later is done here, not in the app — there are no
passwords stored in this codebase, and removing someone in Cloudflare removes
their access immediately.

### 5. Deploy and point the domain

```bash
npm run deploy
```

Then attach the hostname. Because the domain's DNS is not on Cloudflare, you have
two options:

**Option A — move DNS to Cloudflare** (recommended). Add `possabilities.org.uk` as
a site in Cloudflare, update the nameservers at your registrar, then add the
custom domain to the Worker under **Workers & Pages → the worker → Settings →
Domains & Routes**. TLS is automatic.

**Option B — keep DNS where it is.** Cloudflare Workers custom domains require the
zone to be on Cloudflare, so with external DNS you would need a Cloudflare
*subdomain zone* for `invitation.possabilities.org.uk`: delegate just that
subdomain by adding NS records at your current provider. Access also requires the
hostname to be proxied by Cloudflare, so the delegation is not optional if you
want the staff area protected.

If neither is possible, say so before going further — the security model in step 4
depends on Cloudflare sitting in front of the Worker.

### 6. Check it

- Visit `https://invitation.possabilities.org.uk` — you should be asked to sign in.
- Sign in, build an invitation, and use **Send test to me**. It sends to the
  address you signed in with.
- Open the link in the email in a private window. It should load without a login.
- RSVP, then confirm it recorded:

```bash
npx wrangler d1 execute possabilities-invitations --remote --command \
  "SELECT name, status, party_size FROM recipients ORDER BY responded_at DESC LIMIT 5"
```

---

## Things worth knowing

**vinext is young.** It is Cloudflare's own project and it works well here, but
its README describes it as under active development and not yet a drop-in
replacement for every production workload. Pin the version and test after
upgrades.

**Nothing throttles sending.** `sendInvitations` sends one at a time and records
each result before the next, so a partial failure leaves an accurate record. For
lists in the thousands, this should move to a queue — a Worker request has a
wall-clock limit and a very large campaign could hit it.

**The Superuser metrics are placeholders.** They are labelled as such in the
interface. Wiring them to real counts is a small job on top of the existing
schema.

**Guest links do not expire.** Anyone with the link can view the invitation and
change the RSVP. That is usually what you want for an invitation, but it means
the links should be treated as private.
