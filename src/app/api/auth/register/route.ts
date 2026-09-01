import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerClient, setSessionCookie, createSession } from '@/lib/auth';

const Body = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
  password: z.string().min(8).max(128),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await registerClient({
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    password: parsed.data.password,
    email: parsed.data.email || null,
    birthDate: parsed.data.birthDate || null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const token = await createSession(result.clientId, {
    ip: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, clientId: result.clientId });
}
