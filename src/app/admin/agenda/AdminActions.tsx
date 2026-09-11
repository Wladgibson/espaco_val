'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { updateAppointmentStatus } from '@/app/actions/appointments'
import { toast } from 'sonner'

type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export function AdminActions({ id, status }: { id: string; status: Status }) {
  const [pending, start] = useTransition()
  function act(next: 'confirmed' | 'completed' | 'cancelled') {
    start(async () => {
      const res = await updateAppointmentStatus(id, next)
      if ('error' in res) toast.error(res.error)
      else toast.success('Atualizado')
    })
  }
  return (
    <div className="flex gap-2 pt-1">
      {status === 'pending' && (
        <Button size="sm" onClick={() => act('confirmed')} disabled={pending}>Confirmar</Button>
      )}
      {status === 'confirmed' && (
        <Button size="sm" onClick={() => act('completed')} disabled={pending}>Marcar concluído</Button>
      )}
      {status !== 'cancelled' && status !== 'completed' && (
        <Button size="sm" variant="outline" onClick={() => act('cancelled')} disabled={pending}>
          Cancelar
        </Button>
      )}
    </div>
  )
}