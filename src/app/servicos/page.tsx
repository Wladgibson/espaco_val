import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { formatBRL, formatDuration } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Clock, Tag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Serviços — Salão',
  description: 'Catálogo de serviços de depilação e design de sobrancelhas.',
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
};

export default async function ServicosPage() {
  const services = await db.many<Service>(
    `select id, name, description, duration_minutes, price_cents
     from services
     where is_active = true
     order by price_cents asc`
  );

  return (
    <main className="min-h-dvh bg-pink-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-semibold text-pink-700">Nossos serviços</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha o serviço e agende seu horário online.
          </p>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {services.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Nenhum serviço disponível no momento.
          </p>
        ) : (
          services.map(s => <ServiceCard key={s.id} service={s} />)
        )}

        <p className="text-xs text-muted-foreground text-center pt-4">
          Pagamento no local. Cancelamento até 24h antes.
        </p>
      </section>
    </main>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{service.name}</CardTitle>
        {service.description && (
          <CardDescription>{service.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge icon={<Clock className="size-3.5" />} label={formatDuration(service.duration_minutes)} />
          <Badge icon={<Tag className="size-3.5" />} label={formatBRL(service.price_cents)} />
        </div>
        <Link
          href="/agendar"
          className="inline-flex items-center justify-center gap-2 w-full rounded-md text-sm font-medium h-10 px-4 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
        >
          <CalendarDays className="size-4" />
          Agendar este serviço
        </Link>
      </CardContent>
    </Card>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 font-medium">
      {icon}
      {label}
    </span>
  );
}
