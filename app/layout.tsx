import type { Metadata } from 'next'
import { IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { ClientOnlyProviders } from './components/ClientOnlyProviders'

const ibmPlexMono = IBM_Plex_Mono({ weight: ['400', '500', '600', '700'], subsets: ['latin', 'cyrillic'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Exclusive Access | VIRAL Token Gate',
  description: 'Эксклюзивный контент для держателей токенов артиста',
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={ibmPlexMono.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <div className="noise-overlay" />
        <ClientOnlyProviders>{children}</ClientOnlyProviders>
      </body>
    </html>
  )
}