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
    <div className="min-h-dvh bg-[#0E2F33] flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#A7B897]/10 -translate-y-1/3 translate-x-1/3 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#C8B8AA]/8 translate-y-1/3 -translate-x-1/3 blur-3xl pointer-events-none" />

      <div className="w-full max-w-xs relative z-10 fade-in">

        {/* Brand mark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F5F1E8]/10 mb-5 border border-[#F5F1E8]/15">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <ellipse cx="12" cy="16" rx="8" ry="11" stroke="#F5F1E8" strokeWidth="1.5" fill="none"/>
              <ellipse cx="20" cy="16" rx="8" ry="11" stroke="#F5F1E8" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <h1 className="text-[#F5F1E8] text-2xl font-semibold tracking-[-0.03em]">GIANFRANCO</h1>
          <p className="text-[#A7B897] text-xs tracking-[0.18em] uppercase mt-1 font-medium">Coffee Roasters</p>
        </div>

        {/* Card */}
        <div className="bg-[#F5F1E8] rounded-3xl p-6 card-shadow-lg">
          <h2 className="text-[#0E2F33] font-semibold text-lg mb-5 tracking-tight">Acceso al sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#6B7C85] text-xs font-medium uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@gianfranco.com"
                className="w-full bg-white rounded-xl px-4 py-3 text-sm text-[#222222] outline-none border border-[#E6E3DD] focus:border-[#0E2F33] focus:ring-2 focus:ring-[#0E2F33]/10 transition-all placeholder:text-[#C8B8AA]"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-[#6B7C85] text-xs font-medium uppercase tracking-wider mb-2">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="• • • •"
                maxLength={6}
                inputMode="numeric"
                className="w-full bg-white rounded-xl px-4 py-3 text-[#222222] outline-none border border-[#E6E3DD] focus:border-[#0E2F33] focus:ring-2 focus:ring-[#0E2F33]/10 transition-all tracking-[0.4em] text-center text-xl font-medium placeholder:text-[#C8B8AA] placeholder:tracking-widest placeholder:text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0E2F33] hover:bg-[#0a2326] disabled:opacity-50 text-[#F5F1E8] font-semibold py-3.5 rounded-xl transition-all duration-150 text-sm tracking-wide press-scale mt-1"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo hints — development only */}
        {process.env.NODE_ENV !== 'production' && <div className="mt-4 p-4 rounded-2xl border border-[#F5F1E8]/10">
          <p className="text-[#A7B897] text-xs font-medium mb-2 tracking-wider uppercase">Accesos demo</p>
          <div className="space-y-1">
            {[
              ['Admin', 'admin@gianfranco.com', '1234'],
              ['Barra', 'bar@gianfranco.com', '2222'],
              ['Cocina', 'kitchen@gianfranco.com', '3333'],
              ['Salón', 'salon@gianfranco.com', '4444'],
            ].map(([role, mail, p]) => (
              <button
                key={mail}
                onClick={() => { setEmail(mail); setPin(p) }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F5F1E8]/8 transition-colors group"
              >
                <span className="text-[#F5F1E8]/50 text-xs">{role}</span>
                <span className="text-[#F5F1E8]/30 text-xs font-mono">{mail}</span>
              </button>
            ))}
          </div>
        </div>}
      </div>
    </div>
  )
}
