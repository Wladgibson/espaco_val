'use client'

import { useState, useTransition, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendOtp } from '@/app/actions/auth'

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Link expirado ou inválido. Solicite um novo magic link abaixo.',
  otp_expired: 'Link expirado. Solicite um novo magic link.',
  exchange_failed: 'Não foi possível validar o link. Tente novamente.',
  no_code: 'Link inválido. Solicite um novo magic link.',
  auth_failed: 'Falha na autenticação. Tente novamente.',
}

export function LoginForm() {
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    const error = params.get('error')
    const code = params.get('code')
    const msg = params.get('msg')
    if (error) {
      const base = ERROR_MESSAGES[error] ?? `Erro: ${error}`
      const detail = msg && code === 'otp_expired' ? '' : (msg ? ` (${decodeURIComponent(msg)})` : '')
      setResult({ ok: false, msg: base + detail })
    }
  }, [params])

  function onSubmit(formData: FormData) {
    setResult(null)
    start(async () => {
      const res = await sendOtp(formData)
      if ('error' in res) setResult({ ok: false, msg: res.error })
      else setResult({ ok: true, msg: `Enviamos um link para ${res.email}. Verifique sua caixa de entrada.` })
    })
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="seu@email.com" />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Enviando...' : 'Entrar com magic link'}
      </Button>
      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
          {result.msg}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Em desenvolvimento local: cheque o <code>Inbucket</code> em http://127.0.0.1:54324
      </p>
    </form>
  )
}