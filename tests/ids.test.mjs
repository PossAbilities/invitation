import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createId, createInviteToken } from "../lib/ids.ts";

describe("invitation tokens", () => {
  test("are long enough to be unguessable", () => {
    assert.equal(createInviteToken().length, 24);
  });

  test("use only unambiguous characters", () => {
    // No i, l, o or u: tokens end up read aloud and retyped from emails.
    for (let i = 0; i < 200; i += 1) {
      assert.match(createInviteToken(), /^[0-9abcdefghjkmnpqrstvwxyz]{24}$/);
    }
  });

  test("do not repeat", () => {
    const seen = new Set();
    for (let i = 0; i < 5000; i += 1) seen.add(createInviteToken());
    assert.equal(seen.size, 5000);
  });

  test("are spread across the whole alphabet", () => {
    // A crude guard against a generator that silently loses entropy -- for
    // instance by biasing toward the low end of the alphabet.
    const counts = new Map();
    for (let i = 0; i < 2000; i += 1) {
      for (const character of createInviteToken()) {
        counts.set(character, (counts.get(character) ?? 0) + 1);
      }
    }

    assert.equal(counts.size, 32, "every symbol should appear");

    const frequencies = [...counts.values()];
    const expected = (2000 * 24) / 32;
    for (const frequency of frequencies) {
      assert.ok(
        frequency > expected * 0.8 && frequency < expected * 1.2,
        `symbol frequency ${frequency} is far from the expected ${expected}`,
      );
    }
  });
});

describe("row identifiers", () => {
  test("carry their prefix", () => {
    assert.match(createId("evt"), /^evt_[0-9abcdefghjkmnpqrstvwxyz]{16}$/);
  });
});
