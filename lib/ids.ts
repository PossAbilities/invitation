/**
 * Identifier generation.
 *
 * Invitation tokens are the only credential protecting a guest's invitation
 * page, so they come from the platform CSPRNG.
 */

// Crockford base32: 32 symbols, so a random byte maps onto it without modulo
// bias (256 is an exact multiple of 32). Excludes i, l, o and u, which keeps
// tokens readable aloud and avoids the usual 1/l and 0/O transcription errors.
const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

function randomString(length: number) {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);

  let out = "";
  for (const byte of buffer) {
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

/** Unguessable per-guest invitation token: 24 symbols, 120 bits of entropy. */
export function createInviteToken() {
  return randomString(24);
}

/** Internal row identifier. Not secret, but not sequential either. */
export function createId(prefix: string) {
  return `${prefix}_${randomString(16)}`;
}
