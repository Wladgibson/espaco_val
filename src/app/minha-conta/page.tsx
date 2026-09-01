import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { LogoutButton } from './logout-button';

export default async function MinhaContaPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/minha-conta');

  return (
    <main className="min-h-dvh p-4 max-w-md mx-auto bg-pink-50">
      <h1 className="text-2xl font-semibold mb-6">Minha conta</h1>

      <section className="bg-white rounded-lg p-4 shadow-sm space-y-2 mb-4">
        <Row label="Nome" value={user.full_name} />
        <Row label="Telefone" value={user.phone} />
        <Row label="Nascimento" value={user.birth_date ?? '—'} />
        <Row label="Observações" value={user.notes ?? '—'} />
      </section>

      <p className="text-xs text-muted-foreground mb-4">
        Edição de dados e troca de senha virão na próxima iteração.
      </p>

      <nav className="space-y-2">
        <Link
          href="/meus-agendamentos"
          className="block w-full text-center py-3 rounded-md bg-pink-600 text-white font-medium"
        >
          Meus agendamentos
        </Link>
        <Link
          href="/agendar"
          className="block w-full text-center py-3 rounded-md border border-pink-600 text-pink-600 font-medium"
        >
          Agendar novo horário
        </Link>
        <LogoutButton />
      </nav>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}
