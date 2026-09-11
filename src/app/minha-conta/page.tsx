import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/actions/auth'
import { ProfileForm } from './ProfileForm'

export default async function MinhaContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/minha-conta')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!client) {
    return (
      <main className="p-6 max-w-md mx-auto">
        <p>Perfil não encontrado.</p>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <ProfileForm client={client} email={user.email ?? ''} />

      <Separator />

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">Sair</Button>
      </form>

      <div className="text-center">
        <Link href="/agendar" className="text-pink-600 text-sm underline">Agendar horário</Link>
      </div>
    </main>
  )
}