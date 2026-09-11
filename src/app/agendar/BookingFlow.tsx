'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { formatBRL, formatDuration } from '@/lib/format'
import { bookAppointment } from '@/app/actions/appointments'
import { toast } from 'sonner'

interface Service { id: string; name: string; duration_minutes: number; price_cents: number }

interface Props { services: Service[] }

export function BookingFlow({ services }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const preselectedService = params.get('service')

  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState<string | null>(preselectedService)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [slots, setSlots] = useState<string[]>([])
  const [pickedSlot, setPickedSlot] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [pending, startTransition] = useTransition()

  const service = useMemo(() => services.find(s => s.id === serviceId) ?? null, [services, serviceId])

  useEffect(() => {
    if (step !== 3 || !serviceId || !date) return
    setLoadingSlots(true)
    const iso = date.toISOString().slice(0, 10)
    fetch(`/api/slots?service_id=${serviceId}&date=${iso}`)
      .then(r => r.json())
      .then(data => {
        if (data.slots) setSlots(data.slots)
        else toast.error('Erro ao buscar horários')
      })
      .catch(() => toast.error('Erro de rede'))
      .finally(() => setLoadingSlots(false))
  }, [step, serviceId, date])

  function submit() {
    if (!serviceId || !pickedSlot) return
    const fd = new FormData()
    fd.set('service_id', serviceId)
    fd.set('starts_at', pickedSlot)
    fd.set('client_notes', notes)
    startTransition(async () => {
      const res = await bookAppointment(fd)
      if (res && 'error' in res) {
        toast.error(res.error)
      } else {
        toast.success('Agendamento criado!')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Passo {step} de 4</div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1. Escolha o serviço</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {services.map(s => (
              <button
                key={s.id}
                onClick={() => { setServiceId(s.id); setStep(2) }}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  serviceId === s.id ? 'border-pink-600 bg-pink-50' : 'border-border'
                }`}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDuration(s.duration_minutes)} · {formatBRL(s.price_cents)}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && service && (
        <Card>
          <CardHeader><CardTitle>2. Escolha a data</CardTitle></CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { setDate(d); if (d) setStep(3) }}
              disabled={(d) => d < new Date(new Date().toDateString())}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      )}

      {step === 3 && service && (
        <Card>
          <CardHeader><CardTitle>3. Escolha o horário</CardTitle></CardHeader>
          <CardContent>
            {loadingSlots ? (
              <p>Carregando...</p>
            ) : slots.length === 0 ? (
              <p className="text-muted-foreground">Nenhum horário disponível nesta data.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => {
                  const t = new Date(slot)
                  const label = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                  return (
                    <Button
                      key={slot}
                      variant={pickedSlot === slot ? 'default' : 'outline'}
                      onClick={() => { setPickedSlot(slot); setStep(4) }}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && service && pickedSlot && (
        <Card>
          <CardHeader><CardTitle>4. Confirme seu agendamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Serviço</div>
              <div className="font-medium">{service.name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Data e horário</div>
              <div className="font-medium">
                {new Date(pickedSlot).toLocaleString('pt-BR', {
                  dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Valor</div>
              <div className="font-medium text-pink-600">{formatBRL(service.price_cents)}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Voltar</Button>
              <Button onClick={submit} disabled={pending} className="flex-1">
                {pending ? 'Confirmando...' : 'Confirmar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step > 1 && (
        <Button variant="ghost" onClick={() => router.push('/meus-agendamentos')} className="w-full">
          Cancelar e ver meus agendamentos
        </Button>
      )}
    </div>
  )
}