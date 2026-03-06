import type { Metadata } from 'next'
import { IBM_Plex_Serif, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const ibmPlexSerif = IBM_Plex_Serif({ weight: '400', subsets: ['latin'], variable: '--font-display' })
const ibmPlexSans = IBM_Plex_Sans({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Exclusive Access | Artist Token Gate',
  description: 'Эксклюзивный контент для держателей токенов артиста',
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={`${ibmPlexSerif.variable} ${ibmPlexSans.variable}`}>
      <body className="font-sans antialiased">
        <div className="noise-overlay" />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}