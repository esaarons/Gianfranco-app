import { TableMap } from '@/components/tables/TableMap'

export default function TablesPage() {
  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-stone-800">Mapa de Mesas</h1>
        <p className="text-stone-500 text-sm">Toca una mesa para gestionar</p>
      </div>
      <TableMap />
    </div>
  )
}
