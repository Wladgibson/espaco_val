import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6 py-12 text-center bg-gradient-to-b from-background to-pink-50">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-pink-600">
            Espaço Val
          </h1>
          <p className="text-lg text-muted-foreground">
            um complemento para sua Beleza
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/agendar" className="w-full">
            <Button size="lg" className="w-full">Agendar</Button>
          </Link>
          <Link href="/servicos" className="w-full">
            <Button variant="outline" size="lg" className="w-full">Ver serviços</Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button variant="ghost" size="lg" className="w-full">Entrar</Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Em construção — Fase 0 do plano
        </p>
      </div>
    </main>
  );
}