import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number): string {
  return `S/ ${amount.toFixed(2)}`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })
}
