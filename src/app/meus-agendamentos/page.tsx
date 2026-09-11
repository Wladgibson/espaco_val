import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/format'
import { CancelButton } from './CancelButton'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export default async function MeusAgendamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/meus-agendamentos')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, service:services(name, duration_minutes, price_cents)')
    .eq('client_id', user.id)
    .order('starts_at', { ascending: false })

  const now = Date.now()
  const upcoming = (appointments ?? []).filter(a => new Date(a.starts_at).getTime() > now && a.status !== 'cancelled')
  const past = (appointments ?? []).filter(a => new Date(a.starts_at).getTime() <= now || a.status === 'cancelled')

  return (
    <main className="p-6 max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-pink-600">Meus agendamentos</h1>
        <Link href="/agendar">
          <Button size="sm">Novo</Button>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-muted-foreground">Próximos</h2>
        {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>}
        {upcoming.map(a => (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{a.service?.name}</CardTitle>
                <Badge variant={a.status === 'confirmed' ? 'default' : 'secondary'}>
                  {STATUS_LABELS[a.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                {new Date(a.starts_at).toLocaleString('pt-BR', {
                  dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
                })}
              </div>
              <div className="text-muted-foreground">
                {a.service && formatBRL(a.service.price_cents)}
              </div>
              <CancelButton appointmentId={a.id} />
            </CardContent>
          </Card>
        ))}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">Histórico</h2>
          {past.map(a => (
            <Card key={a.id} className="opacity-70">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{a.service?.name}</CardTitle>
                  <Badge variant="outline">{STATUS_LABELS[a.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                {new Date(a.starts_at).toLocaleString('pt-BR', {
                  dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
                })}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <div className="text-center pt-4">
        <Link href="/minha-conta" className="text-sm underline text-muted-foreground">Minha conta</Link>
      </div>
    </main>
  )
}