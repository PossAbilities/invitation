import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { promisify } from "node:util";

import { unstable_startWorker } from "wrangler";

/**
 * End-to-end tests against the real Workers runtime.
 *
 * The Worker imports `cloudflare:workers` and talks to D1, so it cannot be
 * loaded into plain Node. These run the actual built bundle with a local D1
 * behind it, which is what makes the access-control assertions worth anything:
 * a test that stubbed the auth layer would pass no matter how broken it was.
 */

const run = promisify(execFile);
const DB = "possabilities-invitations";
const TOKEN = "testtoken0000000000000aa";

/**
 * Local state lives outside the project directory on purpose: with it inside,
 * D1 writes during a test trip the dev server's file watcher and it restarts
 * mid-request, which shows up as unrelated flakiness.
 */
let statePath;

async function d1(args) {
  return run("npx", ["wrangler", "d1", ...args, "--persist-to", statePath], {
    cwd: process.cwd(),
    timeout: 120_000,
  });
}

let worker;

/**
 * The dev server occasionally recycles itself between requests (D1 writes touch
 * state it watches) and answers 503 "worker restarted mid-request". That is a
 * harness artefact, not application behaviour, so retry those -- and only
 * those -- rather than letting them masquerade as assertion failures.
 */
async function fetchWorker(url, init) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await worker.fetch(url, init);
    if (response.status !== 503 || attempt >= 5) return response;

    const body = await response.clone().text();
    if (!/restarted mid-request/i.test(body)) return response;

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

before(async () => {
  statePath = await mkdtemp(join(tmpdir(), "possabilities-invitations-test-"));

  await d1(["migrations", "apply", DB, "--local"]);

  await d1([
    "execute",
    DB,
    "--local",
    "--command",
    `INSERT INTO events (id, name, card_title, card_header, message, event_date,
       start_time, end_time, location, host, accent, logo_variant, logo_size, status,
       created_by, created_at, updated_at)
     VALUES ('evt_test', 'Summer PossAbilities Social', 'Summer PossAbilities Social',
       'Live The Life You Choose', 'Join us for music, food and games.', '2026-09-18',
       '14:00', '17:30', 'The Social Lounge, Rochdale', 'PossAbilities CIC', '#ec008c',
       'stacked', 'medium', 'live', 'staff@example.org', 1755000000000, 1755000000000);
     INSERT INTO recipients (id, event_id, name, email, token, status, created_at)
     VALUES ('rcp_test', 'evt_test', 'Amelia Hughes', 'amelia@example.org', '${TOKEN}',
       'invited', 1755000000000);`,
  ]);

  worker = await unstable_startWorker({
    config: "dist/server/wrangler.json",
    // Must match where `wrangler d1 ... --local` writes, or the Worker gets a
    // different (empty) database than the one seeded above.
    // Must match where the seeding above wrote, or the Worker gets a different
    // (empty) database.
    dev: { remote: false, server: { port: 0 }, persist: statePath },
  });

  // The dev server can answer 503 for a moment while it finishes wiring itself
  // up. Without this the first assertions race the runtime rather than testing
  // anything about the application.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await worker.fetch("https://invitation.example/");
    if (response.status !== 503) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
});

after(async () => {
  await worker?.dispose();
  if (statePath) await rm(statePath, { recursive: true, force: true });
});

describe("staff area", () => {
  test("refuses anonymous requests instead of rendering the builder", async () => {
    const response = await fetchWorker("https://invitation.example/");

    assert.equal(response.status, 403);
    const body = await response.text();
    assert.match(body, /for PossAbilities staff/i);
    // Nothing about the builder may leak to someone who was refused.
    assert.doesNotMatch(body, /invite-stage|Superuser|Campaigns/);
  });

  test("refuses the write endpoints", async () => {
    for (const path of ["/api/events", "/api/events/evt_test/send", "/api/events/evt_test/test"]) {
      const response = await fetchWorker(`https://invitation.example${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const body = await response.text();
      assert.equal(response.status, 403, `${path} should be refused, got ${response.status}: ${body.slice(0, 200)}`);
    }
  });

  test("a forged Access header is not enough on its own", async () => {
    // The convenience header Cloudflare sets is trivially spoofable by anyone
    // reaching the origin directly. Only the signed assertion counts.
    const response = await fetchWorker("https://invitation.example/", {
      headers: {
        "cf-access-authenticated-user-email": "attacker@example.org",
        "cf-access-jwt-assertion": "not.a.real.jwt",
      },
    });

    assert.equal(response.status, 403);
  });
});

describe("guest invitation", () => {
  test("renders the invitation for a valid token", async () => {
    const response = await fetchWorker(`https://invitation.example/i/${TOKEN}`);

    assert.equal(response.status, 200);
    const html = await response.text();

    assert.match(html, /Summer PossAbilities Social/);
    assert.match(html, /Amelia Hughes/);
    assert.match(html, /18 September 2026/);
    assert.match(html, /The Social Lounge, Rochdale/);
    assert.match(html, /Can you come\?/i);
    // Private links must not end up in search results.
    assert.match(html, /noindex/);
  });

  test("does not reveal anything for an unknown token", async () => {
    const response = await fetchWorker(
      "https://invitation.example/i/aaaaaaaaaaaaaaaaaaaaaaaa",
    );

    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /Summer PossAbilities Social|Amelia/);
  });

  test("records that the guest opened it", async () => {
    await fetchWorker(`https://invitation.example/i/${TOKEN}`);

    const { stdout } = await d1([
      "execute",
      DB,
      "--local",
      "--json",
      "--command",
      `SELECT status FROM recipients WHERE token = '${TOKEN}'`,
    ]);

    assert.match(stdout, /"status":\s*"opened"/);
  });
});
