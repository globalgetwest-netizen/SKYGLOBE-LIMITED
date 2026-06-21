'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import NoriaMark from '@/components/branding/NoriaMark'
import Container from '@/components/layout/Container'

interface Message {
  id: string
  role: 'user' | 'noria'
  content: string
  timestamp: string
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'noria',
  content: 'Hello! I\'m NORIA, your AI-powered immigration advisor. I can help you with visa questions, document requirements, case guidance, and more. What would you like to know?',
  timestamp: new Date().toISOString(),
}

export default function NoriaPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = input.trim()
    if (!content || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/noria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: content }),
      })
      const data = await res.json()
      const noriaMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'noria',
        content: data.answer || 'I\'m sorry, I couldn\'t process that request. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, noriaMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'noria',
          content: 'I\'m temporarily unavailable. Please try again in a moment.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#041022] min-h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 py-6">
        <Container>
          <div className="flex items-center gap-4">
            <NoriaMark size={40} animated />
            <div>
              <h1 className="text-white font-bold text-xl shimmer-text">NORIA</h1>
              <p className="text-white/50 text-xs">Intelligence · Innovation · Impact</p>
            </div>
          </div>
        </Container>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-8">
        <Container>
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'noria' && (
                  <div className="w-9 h-9 flex-shrink-0">
                    <NoriaMark size={36} />
                  </div>
                )}
                <div
                  className={`rounded-[20px] px-5 py-4 max-w-[80%] text-sm leading-[22px] ${
                    msg.role === 'user'
                      ? 'bg-[#1A3A8F] text-white ml-auto'
                      : 'bg-white/10 text-white/90'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="w-9 h-9 flex-shrink-0">
                  <NoriaMark size={36} animated />
                </div>
                <div className="bg-white/10 rounded-[20px] px-5 py-4 flex items-center gap-2">
                  <Loader2 size={16} className="text-[#F5A623] animate-spin" />
                  <span className="text-white/50 text-sm">NORIA is thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </Container>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 py-4">
        <Container>
          <form onSubmit={sendMessage} className="flex gap-3 max-w-2xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask NORIA anything about your visa journey..."
              disabled={loading}
              className="flex-1 px-6 py-3.5 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 focus:border-[#F5A623]/50 disabled:opacity-60 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-12 h-12 rounded-full bg-[#F5A623] flex items-center justify-center hover:bg-[#e0911a] disabled:opacity-40 transition-colors my-auto"
            >
              <Send size={18} className="text-[#041022]" />
            </button>
          </form>
        </Container>
      </div>
    </div>
  )
}
