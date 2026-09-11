import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AdminActions } from './AdminActions'

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  completed: { label: 'Concluído', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
}

export default async function AdminAgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/agenda')

  // RLS + is_admin() já filtra (apenas admin vê todos)
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, service:services(name, duration_minutes, price_cents), client:clients(full_name, phone)')
    .order('starts_at', { ascending: true })

  // agrupa por dia
  const byDay: Record<string, typeof appointments> = {}
  for (const a of appointments ?? []) {
    const day = new Date(a.starts_at).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo'
    })
    if (!byDay[day]) byDay[day] = []
    byDay[day]!.push(a)
  }

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-pink-600">Agenda</h1>

      {Object.keys(byDay).length === 0 && (
        <p className="text-muted-foreground">Nenhum agendamento.</p>
      )}

      {Object.entries(byDay).map(([day, items]) => (
        <section key={day} className="space-y-2">
          <h2 className="font-semibold capitalize">{day}</h2>
          {items!.map(a => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    {new Date(a.starts_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
                    })}
                    {' — '}
                    {a.service?.name}
                  </CardTitle>
                  <Badge variant={STATUS[a.status].variant}>{STATUS[a.status].label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente: </span>
                  {a.client?.full_name} · {a.client?.phone}
                </div>
                {a.client_notes && (
                  <div className="text-xs text-muted-foreground">Nota: {a.client_notes}</div>
                )}
                <AdminActions id={a.id} status={a.status} />
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </main>
  )
}