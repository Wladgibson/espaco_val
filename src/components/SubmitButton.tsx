'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { type ComponentProps } from 'react'

export function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus()
  return (
    <Button {...props} disabled={pending} type="submit">
      {pending ? 'Aguarde...' : children}
    </Button>
  )
}