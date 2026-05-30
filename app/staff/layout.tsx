import { BottomNav } from '@/components/layout/BottomNav'
import { AuthProvider } from '@/components/layout/AuthProvider'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <main className="pb-16 min-h-screen">{children}</main>
      <BottomNav />
    </AuthProvider>
  )
}
