'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { SkyGlobeMark } from '@/components/branding/SkyGlobeMark'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

const serviceChips = ['Study Abroad', 'Work Visas', 'EU Jobs', 'Visit Visas', 'Scholarships']

const stats = [
  { value: '5,000+', label: 'Cases Handled' },
  { value: '47', label: 'Countries' },
  { value: '98%', label: 'Success Rate' },
]

export function Hero() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleTrack(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/track?ref=${encodeURIComponent(query.trim())}`)
  }

  return (
    <section className="pt-24 pb-16 bg-white overflow-hidden">
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-6 items-center min-h-[calc(100vh-96px)]">
          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6"
          >
            <Badge variant="primary">🌍 Global Mobility Experts</Badge>

            <h1 className="text-display font-extrabold text-text leading-tight">
              Your Gateway to{' '}
              <span className="text-primary">Global</span>{' '}
              Opportunities
            </h1>

            <p className="text-body text-gray-500 max-w-lg">
              SkyGlobe Group connects ambitious individuals and businesses to international
              opportunities — study, work, travel, and thrive across 47 countries.
            </p>

            {/* Case tracking bar */}
            <form onSubmit={handleTrack} className="flex gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your case reference…"
                  className="w-full pl-11 pr-4 py-3.5 rounded-pill border border-border text-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <Button type="submit" variant="primary" size="md">
                Track Case <ArrowRight size={16} />
              </Button>
            </form>

            {/* Service chips */}
            <div className="flex flex-wrap gap-2">
              {serviceChips.map((chip) => (
                <span
                  key={chip}
                  className="px-4 py-1.5 rounded-pill bg-surface border border-border text-caption font-medium text-text hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  {chip}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right — globe mark + floating stat badges */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative flex items-center justify-center"
          >
            <div className="float">
              <SkyGlobeMark size={280} />
            </div>

            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="absolute bg-white rounded-card shadow-card-hover border border-border px-4 py-3 text-center"
                style={{
                  top: i === 0 ? '10%' : i === 1 ? '50%' : '80%',
                  right: i === 1 ? '-5%' : '5%',
                  left: i === 1 ? 'auto' : i === 0 ? '5%' : 'auto',
                }}
              >
                <div className="text-h3 font-extrabold text-primary">{stat.value}</div>
                <div className="text-caption text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Container>
    </section>
  )
}

export default Hero
