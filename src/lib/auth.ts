import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from './db';

const COOKIE_NAME = 'salao_session';
const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 1 dia
const BCRYPT_COST = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

function getJwtSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET ausente ou menor que 32 chars no .env.local');
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type SessionPayload = {
  sub: string; // client_id
  sid: string; // session id (uuid)
};

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      return null;
    }
    return { sub: payload.sub, sid: payload.sid };
  } catch {
    return null;
  }
}

export type CurrentUser = {
  id: string;
  full_name: string;
  phone: string;
  birth_date: string | null;
  notes: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // Confirmar sessão ainda válida no DB (não foi revogada / expirou)
  const session = await db.one<{ expires_at: Date }>(
    'select expires_at from auth_sessions where id = $1 and client_id = $2',
    [payload.sid, payload.sub]
  );
  if (!session || session.expires_at.getTime() < Date.now()) {
    return null;
  }

  const user = await db.one<CurrentUser>(
    'select id, full_name, phone, birth_date::text, notes from clients where id = $1',
    [payload.sub]
  );
  return user;
}

export async function createSession(
  clientId: string,
  meta: { ip?: string; userAgent?: string } = {}
): Promise<string> {
  const sid = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MS);

  await db.query(
    `insert into auth_sessions (id, client_id, expires_at, ip_address, user_agent)
     values ($1, $2, $3, $4, $5)`,
    [sid, clientId, expiresAt, meta.ip ?? null, meta.userAgent ?? null]
  );

  return signSessionToken({ sub: clientId, sid });
}

export async function destroySession(token: string): Promise<void> {
  const payload = await verifySessionToken(token);
  if (payload) {
    await db.query('delete from auth_sessions where id = $1', [payload.sid]);
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await destroySession(token);
  cookieStore.delete(COOKIE_NAME);
}

export type RegisterResult =
  | { ok: true; clientId: string }
  | { ok: false; error: 'phone_taken' | 'validation_error' };

export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; error: 'invalid_credentials' | 'locked' | 'validation_error' };

export async function registerClient(input: {
  fullName: string;
  phone: string;
  password: string;
  email?: string | null;
  birthDate?: string | null;
}): Promise<RegisterResult> {
  if (!input.fullName.trim() || !input.phone.trim() || !input.password) {
    return { ok: false, error: 'validation_error' };
  }
  if (input.password.length < 8) {
    return { ok: false, error: 'validation_error' };
  }

  const existing = await db.one<{ id: string }>(
    'select id from clients where phone = $1',
    [input.phone]
  );
  if (existing) return { ok: false, error: 'phone_taken' };

  const clientId = randomUUID();
  const passwordHash = await hashPassword(input.password);

  try {
    await db.query('begin');
    await db.query(
      `insert into clients (id, full_name, phone, birth_date)
       values ($1, $2, $3, $4)`,
      [clientId, input.fullName, input.phone, input.birthDate ?? null]
    );
    await db.query(
      `insert into auth_credentials (client_id, password_hash) values ($1, $2)`,
      [clientId, passwordHash]
    );
    await db.query('commit');
  } catch (e) {
    await db.query('rollback');
    throw e;
  }

  return { ok: true, clientId };
}

export async function loginClient(input: {
  phone: string;
  password: string;
}): Promise<LoginResult> {
  if (!input.phone || !input.password) {
    return { ok: false, error: 'validation_error' };
  }

  const cred = await db.one<{
    client_id: string;
    password_hash: string;
    failed_attempts: number;
    locked_until: Date | null;
  }>(
    `select client_id, password_hash, failed_attempts, locked_until
     from auth_credentials where client_id = (select id from clients where phone = $1)`,
    [input.phone]
  );

  if (!cred) {
    // hash dummy pra não revelar se telefone existe via timing
    await bcrypt.compare(input.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    return { ok: false, error: 'invalid_credentials' };
  }

  if (cred.locked_until && cred.locked_until.getTime() > Date.now()) {
    return { ok: false, error: 'locked' };
  }

  const valid = await verifyPassword(input.password, cred.password_hash);
  if (!valid) {
    const newAttempts = cred.failed_attempts + 1;
    const lockedUntil =
      newAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
        : null;
    await db.query(
      `update auth_credentials
       set failed_attempts = $1, locked_until = $2
       where client_id = $3`,
      [newAttempts, lockedUntil, cred.client_id]
    );
    return { ok: false, error: 'invalid_credentials' };
  }

  // reset contador e atualiza last_login
  await db.query(
    `update auth_credentials
     set failed_attempts = 0, locked_until = null, last_login_at = now()
     where client_id = $1`,
    [cred.client_id]
  );

  const token = await createSession(cred.client_id);
  return { ok: true, token };
}

// ===== Rate limit in-memory (Node process) =====
type RateLimitEntry = { count: number; resetAt: number };
const RATE_BUCKETS = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export function checkRateLimit(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = RATE_BUCKETS.get(key);
  if (!entry || entry.resetAt < now) {
    RATE_BUCKETS.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true, retryAfterSec: 0 };
  }
  if (entry.count >= RATE_LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
