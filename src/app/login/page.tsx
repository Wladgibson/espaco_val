'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Schema = z.object({
  phone: z.string().trim().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos (com DDD)'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type FormData = z.infer<typeof Schema>;

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get('redirect') ?? '/minha-conta';
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.status === 429) {
        toast.error('Muitas tentativas. Tente novamente em alguns minutos.');
        return;
      }
      if (res.status === 423) {
        toast.error('Conta bloqueada por excesso de tentativas. Tente em 15 min.');
        return;
      }
      if (res.status === 401) {
        toast.error('Telefone ou senha incorretos.');
        return;
      }
      if (!res.ok) {
        toast.error('Erro ao entrar. Tente novamente.');
        return;
      }

      toast.success('Bem-vinda de volta!');
      router.push(redirect);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-pink-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua conta para agendar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input
                placeholder="Telefone (só números, com DDD)"
                inputMode="numeric"
                autoComplete="tel"
                {...form.register('phone')}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone.message}</p>
              )}
            </div>
            <div>
              <Input
                type="password"
                placeholder="Senha"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <p className="text-sm text-center mt-4 text-muted-foreground">
            Ainda não tem conta?{' '}
            <Link href="/cadastro" className="text-pink-600 underline">
              Cadastre-se
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
