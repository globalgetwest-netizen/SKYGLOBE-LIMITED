'use client'

import React, { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import Container from '@/components/layout/Container'
import Badge from '@/components/ui/Badge'

interface TimelineEvent {
  date: string
  event: string
  status: string
}

interface CaseData {
  id: string
  service: string
  country: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  timeline: TimelineEvent[]
  createdAt: string
}

const statusConfig = {
  pending: { label: 'Pending', badge: 'warning' as const, icon: Clock },
  in_progress: { label: 'In Progress', badge: 'primary' as const, icon: Loader2 },
  completed: { label: 'Completed', badge: 'success' as const, icon: CheckCircle2 },
  rejected: { label: 'Rejected', badge: 'error' as const, icon: XCircle },
}

function TrackContent() {
  const searchParams = useSearchParams()
  const initialRef = searchParams.get('ref') || ''
  const [caseRef, setCaseRef] = useState(initialRef)
  const [loading, setLoading] = useState(false)
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [error, setError] = useState('')

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseRef.trim()) return
    setLoading(true)
    setError('')
    setCaseData(null)
    try {
      const res = await fetch(`/api/cases/track/${encodeURIComponent(caseRef.trim())}`)
      if (!res.ok) throw new Error('Case not found')
      const data = await res.json()
      setCaseData(data)
    } catch {
      setError('No case found with that reference. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh]">
      {/* Search */}
      <section className="bg-[#F8F9FA] py-16 border-b border-[#DADCE0]">
        <Container>
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-[36px] leading-[44px] font-extrabold text-[#202124] mb-4">
              Track My Case
            </h1>
            <p className="text-[#5F6368] text-sm mb-8">
              Enter your case reference number to get a real-time update.
            </p>
            <form onSubmit={handleTrack} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA0A6]" size={18} />
                <input
                  type="text"
                  value={caseRef}
                  onChange={(e) => setCaseRef(e.target.value)}
                  placeholder="e.g. SG-2024-00123"
                  className="w-full pl-11 pr-4 py-3.5 rounded-full border border-[#DADCE0] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A8F]/30 focus:border-[#1A3A8F]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 rounded-full bg-[#1A3A8F] text-white text-sm font-semibold hover:bg-[#152f7a] disabled:opacity-60 transition-colors"
              >
                {loading ? 'Searching...' : 'Track'}
              </button>
            </form>
          </div>
        </Container>
      </section>

      {/* Results */}
      <section className="py-12">
        <Container>
          {error && (
            <div className="max-w-xl mx-auto text-center">
              <div className="bg-red-50 border border-red-200 rounded-[24px] p-8">
                <XCircle size={40} className="text-red-400 mx-auto mb-3" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {caseData && (
            <div className="max-w-2xl mx-auto">
              {/* Case header */}
              <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(60,64,67,0.10)] p-6 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#5F6368] font-medium mb-1">Case Reference</p>
                    <h2 className="text-xl font-bold text-[#202124]">{caseData.id}</h2>
                    <p className="text-sm text-[#5F6368] mt-1">
                      {caseData.service} — {caseData.country}
                    </p>
                  </div>
                  <Badge variant={statusConfig[caseData.status].badge}>
                    {statusConfig[caseData.status].label}
                  </Badge>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(60,64,67,0.10)] p-6">
                <h3 className="font-bold text-[#202124] mb-6">Case Timeline</h3>
                <div className="space-y-6">
                  {caseData.timeline.map((event, i) => {
                    const isLast = i === caseData.timeline.length - 1
                    return (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${isLast ? 'bg-[#1A3A8F]' : 'bg-[#DADCE0]'}`} />
                          {!isLast && <div className="w-0.5 bg-[#DADCE0] flex-1 mt-1" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-xs text-[#5F6368] mb-0.5">{event.date}</p>
                          <p className="text-sm font-medium text-[#202124]">{event.event}</p>
                          <Badge variant="default" className="mt-1.5">{event.status}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {!loading && !caseData && !error && (
            <div className="max-w-xl mx-auto text-center py-12">
              <Search size={48} className="text-[#DADCE0] mx-auto mb-4" />
              <p className="text-[#5F6368] text-sm">
                Enter your case reference above to see real-time updates.
              </p>
            </div>
          )}
        </Container>
      </section>
    </div>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#1A3A8F]" size={32} /></div>}>
      <TrackContent />
    </Suspense>
  )
}
