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
  assert.match(html, /Campaigns/);
  assert.match(html, /New invitation/);
  assert.match(html, /Continue draft/);
  assert.match(html, /Import people/);
  assert.match(html, /Needs attention/);
  assert.match(html, /Live The Life You Choose/);
  assert.match(html, /Summer PossAbilities Social/);
  assert.match(html, /Big Tea Meet Up/);
  assert.match(html, /Volunteer welcome morning/);
  assert.match(html, /og:image/);
  assert.match(html, /https:\/\/possabilities-invitations\.example\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|Building your site|SkeletonPreview/);
});

test("removes starter skeleton assets and dependency", async () => {
  const [page, layout, styles, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /possabilities-wordmark\.png/);
  assert.match(page, /invite-stage/);
  assert.match(page, /command-grid/);
  assert.match(page, /Start new invitation/);
  assert.match(page, /Add to calendar/);
  assert.match(page, /View map/);
  assert.match(page, /text\/calendar/);
  assert.match(page, /google\.com\/maps\/search/);
  assert.match(page, /journey-line/);
  assert.match(page, /detail-links/);
  assert.match(page, /Card branding/);
  assert.match(page, /Logo style/);
  assert.match(page, /Logo size/);
  assert.match(page, /Header line/);
  assert.match(page, /possabilities-stacked\.png/);
  assert.match(styles, /--pink: #ec008c/i);
  assert.match(styles, /--purple: #48065a/i);
  assert.match(styles, /--teal: #66cccc/i);
  assert.doesNotMatch(styles, /#c59a4d|#ff789a|#b10066/i);
  assert.match(page, /Invitation list/);
  assert.match(page, /Spreadsheet rows/);
  assert.match(page, /CSV file/);
  assert.match(page, /Ryan - Superuser/);
  assert.match(page, /Platform monitor/);
  assert.match(page, /User registration/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("public/og.png", templateRoot));
  await access(new URL("public/brand/possabilities-wordmark.png", templateRoot));
});
