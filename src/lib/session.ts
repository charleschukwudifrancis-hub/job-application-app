const SESSION_COOKIE = "career_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = { userId: string; expiresAt: number };

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(userId: string): Promise<string> {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("APP_SESSION_SECRET must be at least 32 characters.");
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify({
    userId,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
  })));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function readSessionUserId(token: string | undefined): Promise<string | null> {
  const secret = process.env.APP_SESSION_SECRET;
  if (!token || !secret || secret.length < 32) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  try {
    const signatureBytes = decodeBase64Url(signature);
    const signatureBuffer = new ArrayBuffer(signatureBytes.byteLength);
    new Uint8Array(signatureBuffer).set(signatureBytes);
    const verified = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      signatureBuffer,
      new TextEncoder().encode(payload),
    );
    if (!verified) return null;
    const parsed: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    if (!parsed || typeof parsed !== "object") return null;
    const session = parsed as SessionPayload;
    if (typeof session.userId !== "string" || !session.userId || !Number.isSafeInteger(session.expiresAt)) return null;
    if (session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session.userId;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  return (await readSessionUserId(token)) !== null;
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  maxAge: SESSION_LIFETIME_SECONDS,
};
