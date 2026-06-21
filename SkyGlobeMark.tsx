import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'

const trustSignals = [
  { icon: '🏛️', title: 'Registered & Licensed', desc: 'Fully licensed immigration and mobility consultancy.' },
  { icon: '🔒', title: 'GDPR Compliant', desc: 'Your data is encrypted, secured, and never shared.' },
  { icon: '⭐', title: '4.9 / 5 Rating', desc: 'Consistently rated excellent by our clients.' },
  { icon: '🌍', title: 'Global Network', desc: 'Partners and representatives in 47 countries.' },
]

export function About() {
  return (
    <section className="py-20 bg-surface">
      <Container>
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-caption font-semibold uppercase tracking-widest text-primary">About Us</span>
            <h2 className="text-h2 font-bold text-text mt-2 mb-5">
              One World. One Mission.
            </h2>
            <p className="text-body text-gray-500 mb-4">
              SkyGlobe Group Limited is a global mobility and immigration consultancy dedicated to
              helping individuals and organisations navigate the complexities of international
              movement — from study and work to residency and beyond.
            </p>
            <p className="text-body text-gray-500 mb-8">
              Built on transparency, expertise, and a genuine commitment to our clients, we have
              successfully handled over 5,000 cases across 47 countries, maintaining a 98%
              success rate.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '5,000+', label: 'Cases Handled' },
                { value: '47', label: 'Countries' },
                { value: '98%', label: 'Success Rate' },
                { value: '10+', label: 'Years Experience' },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-card p-4 shadow-card text-center">
                  <div className="text-h2 font-extrabold text-primary">{s.value}</div>
                  <div className="text-caption text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {trustSignals.map((t) => (
              <Card key={t.title}>
                <div className="text-3xl mb-3">{t.icon}</div>
                <h3 className="text-h3 font-bold text-text mb-1">{t.title}</h3>
                <p className="text-caption text-gray-500">{t.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

export default About
