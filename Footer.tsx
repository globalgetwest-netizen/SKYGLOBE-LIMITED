'use client'
import { useState } from 'react'
import { Send, Zap, FileSearch, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { NoriaMark } from '@/components/branding/NoriaMark'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'
import { askNoria } from '@/services/noria.service'

const features = [
  { icon: Zap, title: 'Instant Answers', desc: 'Get real-time answers on visas, universities, work permits, and more.' },
  { icon: FileSearch, title: 'Document Analysis', desc: 'Upload your documents and NORIA reviews them for completeness.' },
  { icon: MapPin, title: 'Case Guidance', desc: 'Personalized step-by-step guidance based on your specific case.' },
]

export function Noria() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    try {
      const res = await askNoria(query)
      setAnswer(res.answer)
    } catch {
      setAnswer('NORIA is unavailable right now. Please try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-20 bg-navy">
      <Container>
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="flex justify-center mb-6"
          >
            <NoriaMark size={64} animated />
          </motion.div>
          <h2 className="text-h2 font-bold shimmer-text mb-2">NORIA</h2>
          <p className="text-caption font-semibold uppercase tracking-widest text-white/40 mb-4">
            Intelligence · Innovation · Impact
          </p>
          <p className="text-body text-white/60 max-w-xl mx-auto">
            Your AI-powered guide through every step of your global journey. Ask anything.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-card p-6 text-white"
            >
              <f.icon size={28} className="mb-3 text-noria-orange" />
              <h3 className="text-h3 font-bold mb-2">{f.title}</h3>
              <p className="text-body text-white/60">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Chat input */}
        <form onSubmit={handleAsk} className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask NORIA — visas, universities, work permits, scholarships…"
              className="flex-1 rounded-pill bg-white/10 border border-white/20 text-white placeholder:text-white/40 px-6 py-4 outline-none focus:border-noria-blue focus:ring-2 focus:ring-noria-blue/30 transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-noria-orange to-noria-blue flex items-center justify-center disabled:opacity-50 transition-opacity shrink-0"
            >
              <Send size={20} className="text-white" />
            </button>
          </div>
          {answer && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-5 bg-white/10 border border-white/10 rounded-card text-white/90 text-body"
            >
              {answer}
            </motion.div>
          )}
        </form>
      </Container>
    </section>
  )
}

export default Noria
