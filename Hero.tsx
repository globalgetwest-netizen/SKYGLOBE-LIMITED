import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'

const services = [
  { icon: '🎓', title: 'Study Abroad', desc: 'University admissions, scholarships and student visas for top destinations worldwide.', href: '/services#study' },
  { icon: '✈️', title: 'Visit Visas', desc: 'Tourist and business visit visa applications handled swiftly and accurately.', href: '/services#visit' },
  { icon: '💼', title: 'Work Permits', desc: 'End-to-end work permit processing for skilled professionals and companies.', href: '/services#work' },
  { icon: '🇪🇺', title: 'EU Employment', desc: 'Direct access to employment opportunities across 17 EU member states.', href: '/eu-employment' },
  { icon: '📋', title: 'Immigration Support', desc: 'Residency, citizenship, and family reunification across multiple jurisdictions.', href: '/services#immigration' },
  { icon: '🎤', title: 'Conferences', desc: 'International conference registration, travel, and accommodation packages.', href: '/services#conferences' },
]

export function Services() {
  return (
    <section className="py-20 bg-white">
      <Container>
        <div className="text-center mb-12">
          <span className="text-caption font-semibold uppercase tracking-widest text-primary">What We Do</span>
          <h2 className="text-h2 font-bold text-text mt-2">Our Services</h2>
          <p className="text-body text-gray-500 mt-3 max-w-xl mx-auto">
            Comprehensive global mobility solutions designed to open doors for individuals and businesses alike.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <Card key={s.title}>
              <div className="text-4xl mb-4">{s.icon}</div>
              <h3 className="text-h3 font-bold text-text mb-2">{s.title}</h3>
              <p className="text-body text-gray-500 mb-5">{s.desc}</p>
              <Link
                href={s.href}
                className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:gap-2.5 transition-all"
              >
                Learn More <ArrowRight size={15} />
              </Link>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}

export default Services
