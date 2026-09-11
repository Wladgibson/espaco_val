import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './LoginForm'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Receba um link de acesso por email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <div className="text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-pink-600 underline">
              Cadastre-se
            </Link>
          </div>
          <Link href="/" className="w-full block">
            <Button variant="ghost" className="w-full">Voltar</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}