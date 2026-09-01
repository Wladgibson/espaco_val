import { format } from 'date-fns-tz'

export const SALON_TIMEZONE = 'America/Sao_Paulo'

export function formatInSalonTime(date: Date | string, fmt: string = "dd/MM/yyyy 'às' HH:mm"): string {
  return format(new Date(date), fmt, { timeZone: SALON_TIMEZONE })
}