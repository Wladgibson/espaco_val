'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendOtp } from '@/app/actions/auth'

export function CadastroForm() {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function action(formData: FormData) {
    start(async () => {
      const res = await sendOtp(formData)
      if ('error' in res) setResult({ ok: false, msg: res.error })
      else setResult({ ok: true, msg: `Enviamos um link para ${res.email}. Verifique sua caixa de entrada.` })
    })
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" name="full_name" required placeholder="Maria Silva" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone (WhatsApp)</Label>
        <Input id="phone" name="phone" required placeholder="(11) 99999-9999" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="seu@email.com" />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Enviando...' : 'Criar conta'}
      </Button>
      {result && (
        <p className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`}>{result.msg}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Em dev local: cheque http://127.0.0.1:54324
      </p>
    </form>
  )
}