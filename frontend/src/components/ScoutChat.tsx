import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

export default function ScoutChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        { role: 'bot', text: "👋 Initialize connection.\n\nQuery parameters available:\n- 🎯 **Captaincy Analysis**\n- 🔄 **Transfer Optimization**\n- 📈 **Differential Hunting**" }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg = input
        setMessages(prev => [...prev, { role: 'user', text: userMsg }])
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: userMsg })
            })
            const data = await res.json()

            setMessages(prev => [...prev, { role: 'bot', text: data.response || "Parse error. Rephrase query." }])
        } catch {
            setMessages(prev => [...prev, { role: 'bot', text: "❌ Connection error. Retrying sequence." }])
        }
        setLoading(false)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ ease: "circOut" }}
                        className="mb-4 w-80 md:w-96 bg-surface-container-lowest border border-surface-container-high shadow-2xl flex flex-col pointer-events-auto rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm overflow-hidden"
                        style={{ maxHeight: '600px', height: '500px' }}
                    >
                        {/* Header */}
                        <div className="bg-surface-container-low p-4 border-b border-surface-container-high flex justify-between items-center grain-overlay relative">
                            <div className="flex items-center gap-3 relative z-10">
                                <span className="material-symbols-outlined text-primary text-[28px]">robot_2</span>
                                <div>
                                    <h3 className="font-headline font-bold text-on-surface uppercase tracking-tight leading-none">Scout Terminal</h3>
                                    <span className="font-label text-[9px] uppercase tracking-widest text-primary flex items-center gap-1 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                        Online
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="relative z-10 w-8 h-8 flex items-center justify-center hover:bg-surface-container-high transition-colors cursor-pointer text-outline hover:text-on-surface">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar relative">
                            {messages.map((msg, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={idx} 
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`w-8 h-8 flex items-center justify-center shrink-0 border mt-1 ${
                                        msg.role === 'user' 
                                        ? 'bg-surface-container-high border-surface-container-highest text-outline' 
                                        : 'bg-primary/10 border-primary/20 text-primary'
                                    }`}>
                                        <span className="material-symbols-outlined text-[18px]">
                                            {msg.role === 'user' ? 'person' : 'smart_toy'}
                                        </span>
                                    </div>
                                    <div className={`max-w-[80%] p-4 text-sm relative ${
                                        msg.role === 'user'
                                            ? 'bg-surface-container-low text-on-surface border border-surface-container-high rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                                            : 'bg-transparent text-on-surface border border-surface-container-high rounded-tr-2xl rounded-tl-sm rounded-br-2xl rounded-bl-2xl'
                                        }`}>
                                        
                                        {msg.role === 'user' && (
                                            <div className="absolute -right-1 bottom-0 w-2 h-2 border-r border-b border-surface-container-high bg-surface-container-low clip-triangle-right pointer-events-none"></div>
                                        )}
                                        {msg.role === 'bot' && (
                                            <div className="absolute -left-1 top-0 w-2 h-2 border-l border-t border-surface-container-high bg-surface-container-lowest clip-triangle-left pointer-events-none"></div>
                                        )}

                                        <div className="font-body text-[13px] leading-relaxed markdown-content">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                                                    li: ({ node, ...props }) => <li className="pl-1 text-outline" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-bold text-on-surface" {...props} />,
                                                    code: ({ node, ...props }) => <code className="bg-surface-container-highest px-1.5 py-0.5 rounded font-mono text-xs text-secondary" {...props} />
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {loading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-1">
                                        <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                                    </div>
                                    <div className="bg-transparent border border-surface-container-high rounded-tr-2xl rounded-tl-sm rounded-br-2xl rounded-bl-2xl p-4 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                        <span className="font-mono text-[10px] uppercase tracking-widest text-outline ml-2">Processing</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-surface-container-low border-t border-surface-container-high">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex items-center gap-2 relative"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Execute query..."
                                    className="flex-1 bg-surface-container-highest border border-surface-container-high focus:border-primary focus:ring-1 focus:ring-primary rounded pl-4 pr-12 py-3 text-sm font-body text-on-surface placeholder:text-outline/50 transition-all outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                </button>
                            </form>
                            <div className="mt-2 text-center text-[9px] font-label uppercase tracking-widest text-outline/60">
                                AI may hallucinate. Verify matrix data.
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto w-14 h-14 bg-on-background hover:bg-primary text-background hover:text-on-primary rounded-full shadow-[0_0_20px_rgba(var(--color-primary),0.3)] transition-all flex items-center justify-center cursor-pointer group"
            >
                {isOpen ? (
                    <span className="material-symbols-outlined text-[28px]">close</span>
                ) : (
                    <span className="material-symbols-outlined text-[28px] group-hover:animate-pulse">chat</span>
                )}
            </button>
        </div>
    )
}
