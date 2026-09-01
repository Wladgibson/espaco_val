'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Schema = z.object({
  fullName: z.string().trim().min(2, 'Nome muito curto'),
  phone: z.string().trim().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos (com DDD)'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof Schema>;

export default function CadastroPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { fullName: '', phone: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName,
          phone: data.phone,
          password: data.password,
        }),
      });

      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        if (body.error === 'phone_taken') {
          toast.error('Este telefone já está cadastrado. Tente entrar.');
          return;
        }
        toast.error('Dados inválidos. Confira os campos.');
        return;
      }
      if (!res.ok) {
        toast.error('Erro ao cadastrar. Tente novamente.');
        return;
      }

      toast.success('Conta criada!');
      router.push('/minha-conta');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-pink-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Use seu telefone (com DDD) para se cadastrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input placeholder="Nome completo" autoComplete="name" {...form.register('fullName')} />
              {form.formState.errors.fullName && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.fullName.message}</p>
              )}
            </div>
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
                placeholder="Senha (mínimo 8 caracteres)"
                autoComplete="new-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div>
              <Input
                type="password"
                placeholder="Confirme a senha"
                autoComplete="new-password"
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Criando...' : 'Criar conta'}
            </Button>
          </form>
          <p className="text-sm text-center mt-4 text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="text-pink-600 underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
