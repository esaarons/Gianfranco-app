import { BottomNav } from '@/components/layout/BottomNav'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { RoleGuard } from '@/components/layout/RoleGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RoleGuard allowed={['admin', 'encargado']}>
        <main className="pb-16 min-h-screen">{children}</main>
        <BottomNav />
      </RoleGuard>
    </AuthProvider>
  )
}
