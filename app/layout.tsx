import type { Metadata } from 'next'
import Script from 'next/script'
import { DM_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { ClientOnlyProviders } from './components/ClientOnlyProviders'

const dmSans = DM_Sans({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-body' })
const spaceGrotesk = Space_Grotesk({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-display' })

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
    <html lang="ru" className={`${dmSans.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d))document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');})();`}
        </Script>
        <div className="noise-overlay" />
        <ClientOnlyProviders>{children}</ClientOnlyProviders>
      </body>
    </html>
  )
}