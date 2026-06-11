'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Credenciales incorrectas'); return }
      setUser(data.user)
      router.push(data.redirect)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#0F2018] flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#4EA055]/8 -translate-y-1/3 translate-x-1/3 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#C8913A]/6 translate-y-1/3 -translate-x-1/3 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[320px] relative z-10 fade-in">

        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'rgba(234,217,177,0.10)', border: '1px solid rgba(234,217,177,0.15)' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <ellipse cx="12" cy="16" rx="8" ry="11" stroke="#EAD9B1" strokeWidth="1.5" fill="none"/>
              <ellipse cx="20" cy="16" rx="8" ry="11" stroke="#EAD9B1" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <h1 className="text-[#EAD9B1] text-xl font-bold tracking-[0.06em]">GIANFRANCO</h1>
          <p className="text-white/30 text-[11px] tracking-[0.22em] uppercase mt-1.5">Coffee Roasters & Brunch</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-6" style={{ background: '#F5F2EC', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
          <p className="text-[#1B3428] font-semibold text-base mb-5 tracking-tight">Acceso al sistema</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#6E6860] text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@gianfranco.com"
                className="w-full bg-white rounded-xl px-4 py-3 text-sm text-[#1A1A1A] outline-none border border-[#E8E2D8] focus:border-[#1B3428] focus:ring-2 focus:ring-[#1B3428]/8 transition-all placeholder:text-[#C8C0B8]"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-[#6E6860] text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5">
                PIN
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="· · · ·"
                maxLength={6}
                inputMode="numeric"
                className="w-full bg-white rounded-xl px-4 py-3.5 text-[#1A1A1A] outline-none border border-[#E8E2D8] focus:border-[#1B3428] focus:ring-2 focus:ring-[#1B3428]/8 transition-all tracking-[0.5em] text-center text-2xl font-bold placeholder:text-[#C8C0B8] placeholder:tracking-widest placeholder:text-sm placeholder:font-normal"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B3428] disabled:opacity-50 text-[#EAD9B1] font-bold py-4 rounded-xl text-sm tracking-wide press-scale mt-1"
            >
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo accesses — dev only */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white/25 text-[10px] font-bold uppercase tracking-[0.18em] mb-2">Demo</p>
            <div className="space-y-0.5">
              {[
                ['Admin', 'admin@gianfranco.com', '1234'],
                ['Barra', 'bar@gianfranco.com', '2222'],
                ['Cocina', 'kitchen@gianfranco.com', '3333'],
                ['Salón', 'salon@gianfranco.com', '4444'],
              ].map(([role, mail, p]) => (
                <button
                  key={mail}
                  onClick={() => { setEmail(mail); setPin(p) }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                >
                  <span className="text-white/40 text-xs font-medium">{role}</span>
                  <span className="text-white/20 text-[11px] font-mono">{mail}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
