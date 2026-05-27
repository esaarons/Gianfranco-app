import { Navbar } from '@/components/layout/Navbar'
import { AuthProvider } from '@/components/layout/AuthProvider'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="pt-14 min-h-screen">{children}</main>
    </AuthProvider>
  )
}
