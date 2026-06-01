import type { Metadata, Viewport } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gianfranco Coffee Roasters',
  description: 'Sistema operativo interno',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gianfranco',
    startupImage: [
      // iPhone SE 1ª gen (320×568 @2x)
      { url: '/splashscreens/splash-640x1136.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      // iPhone 8 / 7 / 6s (375×667 @2x)
      { url: '/splashscreens/splash-750x1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      // iPhone 8+ / 7+ (414×736 @3x)
      { url: '/splashscreens/splash-1242x2208.png',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPhone X / XS / 11 Pro (375×812 @3x)
      { url: '/splashscreens/splash-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPhone XR / 11 (414×896 @2x)
      { url: '/splashscreens/splash-828x1792.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      // iPhone XS Max / 11 Pro Max (414×896 @3x)
      { url: '/splashscreens/splash-1242x2688.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPhone 12 mini / 13 mini (360×780 @3x)
      { url: '/splashscreens/splash-1080x2340.png',
        media: '(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPhone 12 / 12 Pro / 13 / 13 Pro / 14 (390×844 @3x)
      { url: '/splashscreens/splash-1170x2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPhone 12 Pro Max / 13 Pro Max / 14 Plus (428×926 @3x)
      { url: '/splashscreens/splash-1284x2778.png',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPhone 14 Pro / 15 / 15 Pro (393×852 @3x)
      { url: '/splashscreens/splash-1179x2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPhone 14 Pro Max / 15 Plus / 15 Pro Max (430×932 @3x)
      { url: '/splashscreens/splash-1290x2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
      // iPad Air / Mini retina (768×1024 @2x)
      { url: '/splashscreens/splash-1536x2048.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
      // iPad Pro 12.9" (1024×1366 @2x)
      { url: '/splashscreens/splash-2048x2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
    ],
  },
  icons: { apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0F3A43',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${spaceGrotesk.variable}`}>
      <body className={`h-full bg-[#F6F2EA] ${spaceGrotesk.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
