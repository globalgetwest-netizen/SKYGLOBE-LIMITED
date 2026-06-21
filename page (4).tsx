import type { NoriaResponse, Case } from '@/types'

export async function askNoria(query: string, context?: Partial<Case>): Promise<NoriaResponse> {
  const res = await fetch('/api/noria', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context }),
  })
  if (!res.ok) throw new Error('NORIA service unavailable')
  return res.json()
}
