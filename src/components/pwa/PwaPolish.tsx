'use client'

import { useEffect, useState } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}

export function IosAddToHomeScreenPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = typeof localStorage !== 'undefined' && localStorage.getItem('ios-prompt-dismissed')
    if (dismissed) return

    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|Edg/i.test(navigator.userAgent)

    if (isIos && !isStandalone && isSafari) setShow(true)
  }, [])

  if (!show) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-zinc-900/95 dark:backdrop-blur">
      <div className="mx-auto flex max-w-lg items-start gap-3">
        <div className="flex-1 text-sm">
          <p className="font-medium">Instale o Espaço Val</p>
          <p className="text-muted-foreground">
            No Safari, toque em <span className="font-medium">Compartilhar</span> (□↑) e depois <span className="font-medium">Adicionar à Tela de Início</span>.
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          className="shrink-0 rounded-md px-2 py-1 text-sm font-medium hover:bg-muted"
          onClick={() => {
            localStorage.setItem('ios-prompt-dismissed', '1')
            setShow(false)
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
