/**
 * POST /api/noria
 *
 * Thin proxy to the standalone NORIA engine service.
 * NORIA now lives in its own repository/deployment (NORIA-ENGINE) so it can
 * serve every SkyGlobe product, not just this website. One brain, many products.
 *
 * Set the SkyGlobe environment variable:
 *   NORIA_API_URL=https://noria.skyglobegroup.com   (or your Render URL)
 *
 * Body: { query: string, history?: { role: 'user'|'assistant', content: string }[] }
 * Response: { answer: string, sources: string[], ... }
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const NORIA_API_URL = process.env.NORIA_API_URL || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const query = String(body?.query ?? body?.message ?? '').trim()
    if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 })

    const upstream = await fetch(`${NORIA_API_URL}/v1/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, history: body?.history }),
    })

    const data = await upstream.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error('NORIA proxy error:', e)
    return NextResponse.json(
      { answer: 'NORIA is temporarily unavailable. Please try again shortly or contact support@skyglobegroup.com.' },
      { status: 200 }
    )
  }
}
