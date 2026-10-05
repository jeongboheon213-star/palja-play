import { webcrypto } from "node:crypto";

type Env = Record<string, string | undefined>;
const decode = (part: string) => Buffer.from(part, "base64url");
/** Validate the signature as well as the claims; a forwarded email header is never authentication. */
export async function adminIdentity(request: Request, env: Env, fetcher: typeof fetch = fetch, diagnose: (code: string) => void = () => {}): Promise<string | null> {
  const reject = (code: string) => { diagnose(code); return null; };
  const team = env.ADMIN_ACCESS_TEAM_DOMAIN?.trim().replace(/\/$/, "");
  const aud = env.ADMIN_ACCESS_AUD?.trim();
  const emails = (env.ADMIN_EMAILS ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const host = env.ADMIN_HOST?.trim().toLowerCase();
  if (!team || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !aud || !emails.length || !host) return reject("AUTH_CONFIG");
  if (new URL(request.url).hostname !== host) return reject("AUTH_HOST");
  const token = request.headers.get("Cf-Access-Jwt-Assertion") ?? "";
  if (!token) return reject("AUTH_TOKEN_MISSING");
  if (token.length > 16000) return reject("AUTH_TOKEN_FORMAT");
  let stage = "AUTH_TOKEN_FORMAT";
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) return reject(stage);
    const [h, p, s] = parts as [string, string, string];
    const header = JSON.parse(decode(h).toString()) as { alg?: string; kid?: string };
    const claims = JSON.parse(decode(p).toString()) as { iss?: string; aud?: unknown; exp?: number; nbf?: number; iat?: number; email?: string; sub?: string };
    stage = "AUTH_CLAIMS";
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== team) return reject("AUTH_ISSUER");
    if (!Array.isArray(claims.aud) || !claims.aud.includes(aud)) return reject("AUTH_AUDIENCE");
    if (!Number.isFinite(claims.exp) || claims.exp! <= now || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now)) || !Number.isFinite(claims.iat) || claims.iat! > now) return reject("AUTH_TIME");
    if (typeof claims.email !== "string" || !emails.includes(claims.email.toLowerCase())) return reject("AUTH_EMAIL");
    if (header.alg !== "RS256" || !header.kid || claims.iss !== team || !Array.isArray(claims.aud) || !claims.aud.includes(aud) || !Number.isFinite(claims.exp) || claims.exp! <= now || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now)) || !Number.isFinite(claims.iat) || claims.iat! > now || !claims.sub || typeof claims.email !== "string" || !emails.includes(claims.email.toLowerCase())) return reject("AUTH_CLAIMS");
    stage = "AUTH_CERT_FETCH";
    const response = await fetcher(`${team}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(8000), redirect: "error" });
    if (!response.ok) return reject(stage);
    const jwks = await response.json() as { keys?: (webcrypto.JsonWebKey & { kid?: string })[] };
    const jwk = jwks.keys?.find(k => k.kid === header.kid && k.kty === "RSA");
    if (!jwk) return reject("AUTH_CERT_KEY");
    stage = "AUTH_CRYPTO";
    const key = await webcrypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    if (!await webcrypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(s), Buffer.from(`${h}.${p}`))) return reject("AUTH_SIGNATURE");
    return claims.email.toLowerCase();
  } catch { return reject(stage); }
}
