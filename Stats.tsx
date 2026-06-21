import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'

export function CTA() {
  return (
    <section className="py-20 bg-primary">
      <Container>
        <div className="text-center">
          <h2 className="text-h2 font-bold text-white mb-4">Ready to Start Your Journey?</h2>
          <p className="text-body text-white/70 max-w-xl mx-auto mb-8">
            Speak to a SkyGlobe expert today and take the first step toward your global opportunity.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="gold" size="lg" href="/contact">Book a Consultation</Button>
            <Button variant="ghost" size="lg" href="/noria" className="border-white/30 text-white hover:bg-white/10">
              Ask NORIA
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default CTA
