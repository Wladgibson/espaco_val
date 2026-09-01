'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function LogoutButton() {
  const router = useRouter();

  const onClick = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      toast.success('Saiu da conta');
      router.push('/');
      router.refresh();
    } else {
      toast.error('Erro ao sair');
    }
  };

  return (
    <button
      onClick={onClick}
      className="block w-full text-center py-3 rounded-md border text-sm text-muted-foreground"
    >
      Sair
    </button>
  );
}
