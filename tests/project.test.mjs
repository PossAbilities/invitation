import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { describe, test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => access(new URL(`../${path}`, import.meta.url));

describe("brand", () => {
  test("keeps the PossAbilities palette", async () => {
    const styles = await read("app/globals.css");

    assert.match(styles, /--pink: #ec008c/i);
    assert.match(styles, /--purple: #48065a/i);
    assert.match(styles, /--teal: #66cccc/i);
  });

  test("defines accessible text colours alongside the brand pink", async () => {
    const styles = await read("app/globals.css");

    // Brand pink is 4.25:1 on white, below the 4.5:1 needed for normal text, so
    // text must not use it directly.
    assert.match(styles, /--pink-ink: #c40074/i);
    assert.match(styles, /--pink-on-dark: #ff6ec0/i);
    assert.doesNotMatch(styles, /color: var\(--pink\);/);
  });

  test("ships the brand assets the pages reference", async () => {
    await exists("public/og.png");
    await exists("public/brand/possabilities-wordmark.png");
    await exists("public/brand/possabilities-stacked.png");
  });
});

describe("hosting", () => {
  test("is no longer tied to ChatGPT hosting", async () => {
    const packageJson = await read("package.json");

    assert.doesNotMatch(packageJson, /@openai\/sites-vite-plugin/);
    await assert.rejects(exists(".openai/hosting.json"), "hosting.json should be gone");
    await assert.rejects(exists("app/chatgpt-auth.ts"), "ChatGPT auth should be gone");
  });

  test("declares the D1 binding the app depends on", async () => {
    const config = await read("wrangler.jsonc");

    assert.match(config, /"binding":\s*"DB"/);
    assert.match(config, /"migrations_dir":\s*"drizzle"/);
  });

  test("keeps secrets out of version control", async () => {
    const config = await read("wrangler.jsonc");
    const ignore = await read(".gitignore");

    for (const secret of ["RESEND_API_KEY", "ACCESS_AUD", "ACCESS_TEAM_DOMAIN"]) {
      // Named in comments is fine; assigned a value is not.
      assert.doesNotMatch(config, new RegExp(`"${secret}"\\s*:`), `${secret} must not be committed`);
    }
    assert.match(ignore, /^\.env\*/m);
  });
});

describe("access control", () => {
  test("guest links are public and everything else is not", async () => {
    const middleware = await read("middleware.ts");

    assert.match(middleware, /"\/i\/"/, "guest invitation links must stay public");
    assert.match(middleware, /cf-access-jwt-assertion/);
  });

  test("verifies the signed assertion rather than the spoofable header", async () => {
    const auth = await read("lib/auth.ts");

    assert.match(auth, /crypto\.subtle\.verify/);
    // The convenience header can be set by anyone who reaches the origin
    // directly, so it must never be the thing that grants access.
    assert.doesNotMatch(auth, /return.*oai-authenticated|cf-access-authenticated-user-email/);
  });
});
