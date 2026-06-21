'use client'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { SkyGlobeMark } from '@/components/branding/SkyGlobeMark'
import { Button } from '@/components/ui/Button'
import { Container } from './Container'
import { useUIStore } from '@/store/ui.store'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'EU Employment', href: '/eu-employment' },
  { label: 'Track My Case', href: '/track' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

export function Navbar() {
  const { mobileMenuOpen, toggleMobileMenu, setMobileMenuOpen } = useUIStore()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
      <Container>
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <SkyGlobeMark size={32} />
            <span className="font-bold text-primary text-lg tracking-tight">SkyGlobe</span>
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="px-4 py-2 rounded-pill text-[15px] font-medium text-text hover:bg-surface hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Button variant="ghost" size="sm" href="/noria">Ask NORIA</Button>
            <Button variant="primary" size="sm" href="/contact">Get Started</Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-text hover:bg-surface transition-colors"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </Container>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-border px-4 pb-6">
          <ul className="flex flex-col gap-1 pt-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl font-medium text-text hover:bg-surface hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 mt-4">
            <Button variant="ghost" href="/noria" className="w-full justify-center">Ask NORIA</Button>
            <Button variant="primary" href="/contact" className="w-full justify-center">Get Started</Button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
