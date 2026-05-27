import { AuthProvider } from '@/components/layout/AuthProvider'

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
