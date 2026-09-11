'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { cancelAppointment } from '@/app/actions/appointments'
import { toast } from 'sonner'

export function CancelButton({ appointmentId }: { appointmentId: string }) {
  const [pending, start] = useTransition()
  function onClick() {
    if (!confirm('Cancelar este agendamento?')) return
    start(async () => {
      const res = await cancelAppointment(appointmentId)
      if ('error' in res) toast.error(res.error)
      else toast.success('Agendamento cancelado')
    })
  }
  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={pending}>
      {pending ? 'Cancelando...' : 'Cancelar'}
    </Button>
  )
}