'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { User } from '@/types'

const ROLE_LABELS = { admin: 'Admin', salon: 'Salón', bar: 'Barra', kitchen: 'Cocina' }

export default function StaffPage() {
  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      return res.json()
    },
  })

  async function toggleActive(user: User) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    })
    queryClient.invalidateQueries({ queryKey: ['users'] })
    toast.success(`${user.name} ${user.active ? 'desactivado' : 'activado'}`)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Equipo</h1>
        <p className="text-stone-400 text-sm">{users.length} colaboradores</p>
      </div>

      {isLoading ? (
        <div className="text-center text-stone-400 py-8">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-stone-100">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold text-lg">
                {user.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 truncate">{user.name}</p>
                <p className="text-stone-400 text-xs">{user.email}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-full font-medium">
                {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
              </span>
              <button
                onClick={() => toggleActive(user)}
                className={`w-10 h-6 rounded-full transition-colors ${user.active ? 'bg-emerald-400' : 'bg-stone-200'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white mx-auto transition-transform ${user.active ? 'translate-x-2' : '-translate-x-2'}`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
