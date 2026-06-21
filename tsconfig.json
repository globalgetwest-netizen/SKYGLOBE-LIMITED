import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'SkyGlobe Group | Your Gateway to Global Opportunities',
  description:
    'SkyGlobe Group connects ambitious individuals and families with life-changing opportunities across 47 countries. Study abroad, work permits, EU employment, and more.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-inter antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
