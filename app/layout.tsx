import type { Metadata } from 'next'
import { Instrument_Serif, Outfit } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const instrumentSerif = Instrument_Serif({ weight: '400', subsets: ['latin'], variable: '--font-display' })
const outfit = Outfit({ subsets: ['latin', 'cyrillic'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Exclusive Access | Artist Token Gate',
  description: 'Эксклюзивный контент для держателей токенов артиста',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={`${instrumentSerif.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased">
        <div className="noise-overlay" />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}