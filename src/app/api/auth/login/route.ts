import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginClient, setSessionCookie, checkRateLimit } from '@/lib/auth';

const Body = z.object({
  phone: z.string().trim().min(10).max(11),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  const limit = checkRateLimit(`login:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }

  const result = await loginClient({
    phone: parsed.data.phone,
    password: parsed.data.password,
  });

  if (!result.ok) {
    if (result.error === 'locked') {
      return NextResponse.json({ error: 'locked' }, { status: 423 });
    }
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  await setSessionCookie(result.token);

  return NextResponse.json({ ok: true });
}
