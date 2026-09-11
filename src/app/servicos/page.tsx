import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import { formatBRL, formatDuration } from '@/lib/format'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-pink-600">Serviços</h1>
        <p className="text-muted-foreground">Conheça nossos serviços e agende online</p>
      </header>

      <div className="grid gap-4">
        {(services ?? []).map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{s.name}</CardTitle>
                <Badge variant="secondary">{formatDuration(s.duration_minutes)}</Badge>
              </div>
              {s.description && <CardDescription>{s.description}</CardDescription>}
            </CardHeader>
            <CardContent />
            <CardFooter className="flex items-center justify-between">
              <span className="text-lg font-semibold text-pink-600">
                {formatBRL(s.price_cents)}
              </span>
              <Link href={`/agendar?service=${s.id}`}>
                <Button>Agendar</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
        {(!services || services.length === 0) && (
          <p className="text-muted-foreground text-center py-8">Nenhum serviço disponível.</p>
        )}
      </div>

      <div className="text-center pt-4">
        <Link href="/" className="text-sm text-muted-foreground underline">Voltar</Link>
      </div>
    </main>
  )
}