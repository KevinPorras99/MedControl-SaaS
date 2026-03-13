import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Send, X, Bot, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SUGGESTIONS = [
  '¿Cuáles son mis citas de hoy?',
  '¿Cómo registro un paciente nuevo?',
]

function Bubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          <Bot size={12} className="text-yellow-400" />
        </div>
      )}
      <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-yellow-500/20 border border-yellow-500/25 text-white rounded-br-sm'
          : 'bg-white/[0.06] border border-white/[0.08] text-white/90 rounded-bl-sm'
      }`}>
        {content}
      </div>
    </div>
  )
}

export default function MedicalAssistant() {
  const [open, setOpen]           = useState(false)
  const [input, setInput]         = useState('')
  const [messages, setMessages]   = useState([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError]         = useState(null)
  const { getToken }              = useAuth()
  const bottomRef                 = useRef(null)
  const abortRef                  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || streaming) return
    setInput('')
    setError(null)

    const userMsg    = { role: 'user', content: msg }
    const history    = [...messages, userMsg]
    setMessages(history)
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const token      = await getToken()
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch(`${API_URL}/api/assistant/chat`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body:   JSON.stringify({ messages: history }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Error ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const { text: chunk } = JSON.parse(data)
            setMessages(prev => {
              const last = prev[prev.length - 1]
              return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
            })
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error al conectar con MedTron. Intenta de nuevo.')
        setMessages(prev => {
          const last = prev[prev.length - 1]
          return last?.content === '' ? prev.slice(0, -1) : prev
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <>
      {/* ── Botón flotante ─────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl"
        style={{
          background:           open ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #EAB308, #F59E0B)',
          border:               '1px solid rgba(255,255,255,0.15)',
          backdropFilter:       'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow:            open ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(234,179,8,0.35)',
        }}
        aria-label="Asistente médico"
      >
        {open ? <X size={20} className="text-white/80" /> : <Bot size={22} className="text-black" />}
      </button>

      {/* ── Panel ──────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[370px] h-[560px] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background:           'rgba(8, 8, 10, 0.75)',
            border:               '1px solid rgba(255,255,255,0.08)',
            backdropFilter:       'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow:            '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />

          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center">
                <Bot size={16} className="text-yellow-400" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">MedTron</p>
              <p className="text-xs text-white/35">Asistente Médico IA</p>
            </div>
            {streaming && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="ml-auto text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 px-2 py-1 rounded-lg transition-all"
              >
                Detener
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <Bot size={24} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/70">Hola, soy MedTron</p>
                  <p className="text-xs text-white/35 mt-1">¿En qué puedo ayudarte hoy?</p>
                </div>
                <div className="flex flex-col gap-2 w-full mt-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => handleSend(s)}
                      className="text-xs text-white/50 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/[0.05] hover:text-white/80 hover:border-white/20 transition-all text-left"
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}

            {streaming && messages.at(-1)?.role === 'assistant' && messages.at(-1)?.content === '' && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                  <Bot size={12} className="text-yellow-400" />
                </div>
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <Loader2 size={14} className="text-white/40 animate-spin" />
                </div>
              </div>
            )}

            {error && <p className="text-xs text-rose-400 text-center py-2">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <input
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje…" disabled={streaming}
              className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-yellow-500/40 focus:bg-white/[0.08] transition-all disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()} disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:bg-white/[0.06] flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-lg shadow-yellow-500/20 disabled:shadow-none"
            >
              <Send size={15} className="text-black" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
