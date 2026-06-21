import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'

const countries = [
  { flag: '🇩🇪', name: 'Germany' }, { flag: '🇫🇷', name: 'France' }, { flag: '🇳🇱', name: 'Netherlands' },
  { flag: '🇧🇪', name: 'Belgium' }, { flag: '🇦🇹', name: 'Austria' }, { flag: '🇸🇪', name: 'Sweden' },
  { flag: '🇩🇰', name: 'Denmark' }, { flag: '🇫🇮', name: 'Finland' }, { flag: '🇮🇪', name: 'Ireland' },
  { flag: '🇵🇹', name: 'Portugal' }, { flag: '🇪🇸', name: 'Spain' }, { flag: '🇮🇹', name: 'Italy' },
  { flag: '🇱🇺', name: 'Luxembourg' }, { flag: '🇨🇿', name: 'Czech Rep.' }, { flag: '🇵🇱', name: 'Poland' },
  { flag: '🇸🇰', name: 'Slovakia' }, { flag: '🇭🇺', name: 'Hungary' },
]

export function Employment() {
  return (
    <section className="py-20 bg-surface">
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-caption font-semibold uppercase tracking-widest text-green-700">EU Employment</span>
            <h2 className="text-h2 font-bold text-text mt-2 mb-4">
              Work Legally Across the European Union
            </h2>
            <p className="text-body text-gray-500 mb-6">
              Access verified employment opportunities across 17 EU member states. We handle
              work permits, relocation, and compliance — so you can focus on building your career.
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {['End-to-end permit processing', 'Employer partnerships in 17 countries', 'Relocation & housing support', 'GDPR-compliant document handling'].map((point) => (
                <li key={point} className="flex items-center gap-3 text-body text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">✓</span>
                  {point}
                </li>
              ))}
            </ul>
            <Button variant="primary" href="/eu-employment">Explore EU Opportunities</Button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {countries.map((c) => (
              <div
                key={c.name}
                className="bg-white border border-border rounded-card p-3 text-center shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="text-2xl mb-1">{c.flag}</div>
                <div className="text-caption font-medium text-text">{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

export default Employment
