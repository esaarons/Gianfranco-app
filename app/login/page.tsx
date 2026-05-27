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

      if (!res.ok) {
        toast.error(data.error ?? 'Error al iniciar sesión')
        return
      }

      setUser(data.user)
      router.push(data.redirect)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">☕</div>
          <h1 className="text-2xl font-bold text-white">Gianfranco</h1>
          <p className="text-stone-400 text-sm mt-1">Coffee Roasters & Brunch</p>
        </div>

        {/* Card */}
        <div className="bg-stone-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-5">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-stone-400 text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@gianfranco.com"
                className="w-full bg-stone-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-stone-500"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-stone-400 text-sm mb-1.5">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength={6}
                inputMode="numeric"
                className="w-full bg-stone-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-stone-500 tracking-widest text-center text-xl"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-bold py-3 rounded-xl transition-colors mt-2 text-sm"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Demo hints */}
        <div className="mt-4 p-4 bg-stone-800/50 rounded-xl text-xs text-stone-500 space-y-1">
          <p className="text-stone-400 font-medium mb-2">Accesos demo:</p>
          <p>admin@gianfranco.com — PIN: 1234</p>
          <p>bar@gianfranco.com — PIN: 2222</p>
          <p>kitchen@gianfranco.com — PIN: 3333</p>
          <p>salon@gianfranco.com — PIN: 4444</p>
        </div>
      </div>
    </div>
  )
}
