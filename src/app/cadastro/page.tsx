import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CadastroForm } from './CadastroForm'

export default function CadastroPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Você receberá um link por email para confirmar</CardDescription>
        </CardHeader>
        <CardContent>
          <CadastroForm />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="text-pink-600 underline">Entrar</Link>
          </div>
          <Link href="/" className="mt-2 w-full block">
            <Button variant="ghost" className="w-full">Voltar</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}