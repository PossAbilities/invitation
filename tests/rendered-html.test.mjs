import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://possabilities-invitations.example/", {
      headers: {
        accept: "text/html",
        host: "possabilities-invitations.example",
        "x-forwarded-proto": "https",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the PossAbilities invitation prototype", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>PossAbilities Invitations<\/title>/i);
  assert.match(html, /Design a hosted invite/);
  assert.match(html, /Animated invite preview/);
  assert.match(html, /aria-label="Open invitation envelope"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /Live The Life You Choose/);
  assert.match(html, /Summer PossAbilities Social/);
  assert.match(html, /Add invitation recipients/);
  assert.match(html, /Paste spreadsheet rows/);
  assert.match(html, /Upload CSV/);
  assert.match(html, /Registration and superuser view/);
  assert.match(html, /Ryan - Superuser/);
  assert.match(html, /User registration/);
  assert.match(html, /Platform monitor/);
  assert.match(html, /Invite list/);
  assert.match(html, /Inbox preview/);
  assert.match(html, /Campaign pulse/);
  assert.match(html, /og:image/);
  assert.match(html, /https:\/\/possabilities-invitations\.example\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|Building your site|SkeletonPreview/);
});

test("removes starter skeleton assets and dependency", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /possabilities-wordmark\.png/);
  assert.match(page, /invite-stage/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("public/og.png", templateRoot));
  await access(new URL("public/brand/possabilities-wordmark.png", templateRoot));
});
