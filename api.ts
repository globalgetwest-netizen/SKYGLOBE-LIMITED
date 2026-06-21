import type { Metadata } from 'next'
import Contact from '@/components/sections/Contact'

export const metadata: Metadata = {
  title: 'Contact Us | SkyGlobe Group',
  description: 'Get in touch with SkyGlobe Group. We respond within 24 hours.',
}

export default function ContactPage() {
  return <Contact />
}
