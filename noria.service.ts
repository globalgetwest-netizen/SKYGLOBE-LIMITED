import Link from 'next/link'
import { NoriaMark } from '@/components/branding/NoriaMark'
import { SkyGlobeMark } from '@/components/branding/SkyGlobeMark'
import { Container } from './Container'

const columns = [
  {
    heading: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Our Team', href: '/about#team' },
      { label: 'Careers', href: '/about#careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Services',
    links: [
      { label: 'Study Abroad', href: '/services#study' },
      { label: 'Work Visas', href: '/services#work' },
      { label: 'Visit Visas', href: '/services#visit' },
      { label: 'EU Employment', href: '/eu-employment' },
      { label: 'Immigration Support', href: '/services#immigration' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Track My Case', href: '/track' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Ask NORIA', href: '/noria' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 py-16">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <SkyGlobeMark size={32} />
              <span className="font-bold text-lg tracking-tight">SkyGlobe</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-[220px]">
              Your gateway to global opportunities. One World. One Mission.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
                {col.heading}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} SkyGlobe Group Limited. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <NoriaMark size={18} />
            <span>Powered by NORIA</span>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
