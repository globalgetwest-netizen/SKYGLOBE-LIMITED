'use client'
import { useState, useEffect } from 'react'
import { casesService } from '@/services/cases.service'
import type { Case } from '@/types'

export function useCases() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    casesService.list()
      .then(setCases)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { cases, loading, error }
}

export function useTrackCase(reference: string) {
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function track() {
    setLoading(true)
    setError(null)
    try {
      const data = await casesService.track(reference)
      setCaseData(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Case not found')
    } finally {
      setLoading(false)
    }
  }

  return { caseData, loading, error, track }
}
