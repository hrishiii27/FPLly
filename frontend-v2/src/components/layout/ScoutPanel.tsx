import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, X, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { api } from '../../lib/api'
import { InlineError, inputClass } from '../ui/primitives'

export default function ScoutPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Scout is a **stats router** (not ChatGPT). Ask:\n- **Who should I captain?**\n- **Who should I transfer in?**\n- **Best differentials**\n- **Chips** / a **player name**',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input
    setInput('')
    setError('')
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const data = await api.chat(userMsg)
      setMessages((prev) => [...prev, { role: 'bot', text: data.response || data.response || 'Parse error. Rephrase query.' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Connection error. Check that the API is running, then retry.' }])
    }
    setLoading(false)
  }

  return (
    <div className="fixed z-50 right-4 bottom-[5.5rem] md:bottom-6 md:right-6 flex flex-col items-end gap-3">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scout-title"
          className="w-[min(24rem,calc(100vw-2rem))] h-[min(28rem,60vh)] bg-card border border-border flex flex-col shadow-lg"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
            <div>
              <h2 id="scout-title" className="font-display text-xl font-semibold leading-none">
                Scout
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-fg mt-1">Stats router</p>
            </div>
            <button
              type="button"
              aria-label="Close scout"
              onClick={() => setOpen(false)}
              className="min-h-11 min-w-11 inline-flex items-center justify-center cursor-pointer hover:bg-muted"
            >
              <X size={18} />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="min-w-8 h-8 border border-border flex items-center justify-center text-muted-fg shrink-0">
                  {msg.role === 'user' ? <User size={14} aria-hidden /> : <MessageSquare size={14} aria-hidden />}
                </div>
                <div className={`text-sm max-w-[80%] px-3 py-2 border border-border ${msg.role === 'user' ? 'bg-muted' : 'bg-background'}`}>
                  <ReactMarkdown
                    components={{
                      p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({ ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                      li: ({ ...props }) => <li className="text-muted-fg" {...props} />,
                      strong: ({ ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                      code: ({ ...props }) => <code className="font-mono text-xs bg-muted px-1" {...props} />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && <p className="font-mono text-[11px] uppercase tracking-widest text-muted-fg">Looking up…</p>}
          </div>
          <form
            className="p-3 border-t border-border bg-surface"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <label htmlFor="scout-input" className="sr-only">
              Ask Scout
            </label>
            <div className="flex gap-2">
              <input
                id="scout-input"
                ref={inputRef}
                className={inputClass}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Who should I captain?"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send"
                className="min-h-11 min-w-11 inline-flex items-center justify-center bg-primary text-on-primary cursor-pointer disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
            {error ? <InlineError message={error} /> : null}
          </form>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? 'scout-title' : undefined}
        onClick={() => setOpen((v) => !v)}
        className="min-h-12 min-w-12 inline-flex items-center justify-center bg-primary text-on-primary cursor-pointer hover:opacity-90"
        aria-label={open ? 'Close scout' : 'Open scout'}
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
      </button>
    </div>
  )
}
