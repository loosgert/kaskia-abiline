import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "kaskia_admin";
const SESSION_DAYS = 7;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function sameText(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return sameText(password, expected);
}

export function createAdminToken(): { value: string; maxAge: number } {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const expires = Math.floor(Date.now() / 1000) + maxAge;
  const payload = `admin.${expires}`;
  return { value: `${payload}.${sign(payload)}`, maxAge };
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token || !process.env.SESSION_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!sameText(parts[2], sign(payload))) return false;
  return Number(parts[1]) > Date.now() / 1000;
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}

// Salted hash of the client IP for rate limiting; the raw IP is never stored.
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${process.env.SESSION_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 32);
}
