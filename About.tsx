import { Check } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'

const plans = [
  {
    name: 'Starter',
    price: '$299',
    desc: 'For individuals exploring global opportunities.',
    features: ['1 visa application', 'NORIA AI guidance', 'Document checklist', 'Email support', 'Case tracking'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$699',
    desc: 'For professionals and students pursuing international careers.',
    features: ['3 visa applications', 'Priority NORIA access', 'Document review', 'Priority support', 'Case tracking', 'EU Employment matching', 'Monthly consultations'],
    cta: 'Get Started',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For businesses and organisations with multiple applicants.',
    features: ['Unlimited applications', 'Dedicated case manager', 'API access', 'SLA guarantee', 'GDPR compliance', 'Staff portal', 'Custom reporting'],
    cta: 'Contact Us',
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section className="py-20 bg-white">
      <Container>
        <div className="text-center mb-12">
          <span className="text-caption font-semibold uppercase tracking-widest text-primary">Pricing</span>
          <h2 className="text-h2 font-bold text-text mt-2">Simple, Transparent Pricing</h2>
          <p className="text-body text-gray-500 mt-3 max-w-lg mx-auto">
            No hidden fees. No surprises. Choose the plan that fits your journey.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-card p-8 border flex flex-col gap-6 ${
                plan.highlight
                  ? 'bg-primary text-white border-primary shadow-card-hover ring-2 ring-primary/30'
                  : 'bg-white text-text border-border shadow-card'
              }`}
            >
              <div>
                <h3 className="text-h3 font-bold mb-1">{plan.name}</h3>
                <p className={`text-caption ${plan.highlight ? 'text-white/70' : 'text-gray-500'}`}>{plan.desc}</p>
              </div>
              <div className="text-display font-extrabold">{plan.price}</div>
              <ul className="flex flex-col gap-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-body">
                    <Check size={16} className={plan.highlight ? 'text-gold' : 'text-primary'} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlight ? 'gold' : 'ghost'}
                href={plan.cta === 'Contact Us' ? '/contact' : '/contact'}
                className="w-full justify-center"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

export default Pricing
