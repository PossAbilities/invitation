import { env } from "cloudflare:workers";
import { headers } from "next/headers";

/**
 * Cloudflare Access authentication for staff routes.
 *
 * Access sits in front of the Worker and forwards two things: a convenience
 * header naming the signed-in user, and a signed JWT in `Cf-Access-Jwt-Assertion`.
 *
 * We verify the JWT rather than trusting the header. The header alone is only
 * trustworthy if every possible path to the Worker goes through Access, and that
 * is not guaranteed -- workers.dev subdomains, Access misconfiguration, or a
 * later route change can all expose the origin directly, at which point anyone
 * can set `Cf-Access-Authenticated-User-Email` to whatever they like.
 */

export type StaffUser = {
  email: string;
};

type AccessClaims = {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iat?: number;
  iss?: string;
};

const JWT_HEADER = "cf-access-jwt-assertion";

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeSegment(segment: string): unknown {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)));
}

type CachedKeys = { fetchedAt: number; keys: Map<string, CryptoKey> };
let keyCache: CachedKeys | null = null;

/**
 * Access rotates its signing keys, so the key set is refetched periodically.
 * An hour matches Cloudflare's documented rotation cadence with margin.
 */
const KEY_TTL_MS = 60 * 60 * 1000;

async function getSigningKeys(teamDomain: string) {
  const now = Date.now();
  if (keyCache && now - keyCache.fetchedAt < KEY_TTL_MS) {
    return keyCache.keys;
  }

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    throw new Error(`Could not fetch Access signing keys (${response.status})`);
  }

  const body = (await response.json()) as { keys?: Array<JsonWebKey & { kid?: string }> };
  const keys = new Map<string, CryptoKey>();

  for (const jwk of body.keys ?? []) {
    if (!jwk.kid) continue;
    keys.set(
      jwk.kid,
      await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      ),
    );
  }

  keyCache = { fetchedAt: now, keys };
  return keys;
}

/**
 * Returns the signed-in staff user, or null when the request carries no valid
 * Access assertion.
 */
export async function verifyAccessToken(token: string | null): Promise<StaffUser | null> {
  const teamDomain = env.ACCESS_TEAM_DOMAIN;
  const audience = env.ACCESS_AUD;

  // Without Access configured there is no way to tell staff from strangers.
  // Fail closed rather than waving everyone through.
  if (!teamDomain || !audience) {
    return null;
  }

  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header: { kid?: string; alg?: string };
  let claims: AccessClaims;
  try {
    header = decodeSegment(parts[0]) as { kid?: string; alg?: string };
    claims = decodeSegment(parts[1]) as AccessClaims;
  } catch {
    return null;
  }

  if (header.alg !== "RS256" || !header.kid) return null;

  const keys = await getSigningKeys(teamDomain);
  const key = keys.get(header.kid);
  if (!key) return null;

  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!verified) return null;

  // A valid signature is not enough: the token must be for this application and
  // still be in date, or a token minted for a different Access app on the same
  // team would be accepted here.
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(audience)) return null;

  if (claims.iss !== `https://${teamDomain}`) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp < nowSeconds) return null;

  if (!claims.email) return null;

  return { email: claims.email };
}

/** Reads and verifies the Access assertion on the current server request. */
export async function getStaffUser(): Promise<StaffUser | null> {
  const requestHeaders = await headers();
  return verifyAccessToken(requestHeaders.get(JWT_HEADER));
}

/** True when Access is wired up at all. Used to explain misconfiguration. */
export function isAccessConfigured() {
  return Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD);
}

/** Throws a 403 Response for routes that must never render for the public. */
export async function requireStaffUser(): Promise<StaffUser> {
  const user = await getStaffUser();
  if (user) return user;

  throw new Response("Not authorised", { status: 403 });
}
