import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Image as ImageIcon, X, Bot, User, Trash2,
  ChevronDown, Plus, MessageSquare, Sparkles, Mic, ArrowUp, PanelLeft,
} from 'lucide-react'
import api from '../../api/client'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// ── Subject / section config ────────────────────────────────────────────────
const SUBJECTS = {
  SAT: {
    label: 'SAT',
    color: 'sky',
    sections: [
      { key: 'general', label: 'General' },
      { key: 'math', label: 'Math' },
      { key: 'reading_writing', label: 'Reading & Writing' },
    ],
  },
  IELTS: {
    label: 'IELTS',
    color: 'emerald',
    sections: [
      { key: 'general', label: 'General' },
      { key: 'reading', label: 'Reading' },
      { key: 'listening', label: 'Listening' },
      { key: 'writing', label: 'Writing' },
      { key: 'speaking', label: 'Speaking' },
    ],
  },
  CEFR: {
    label: 'CEFR',
    color: 'violet',
    sections: [
      { key: 'general', label: 'General' },
      { key: 'grammar', label: 'Grammar' },
      { key: 'reading', label: 'Reading' },
      { key: 'listening', label: 'Listening' },
    ],
  },
}

const COLOR = {
  sky: { bg: 'bg-sky-500', light: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', ring: 'ring-sky-300' },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-300' },
  violet: { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', ring: 'ring-violet-300' },
}

// ── Markdown message renderer ────────────────────────────────────────────────
function MessageContent({ content }) {
  const normalizedContent = useMemo(() => {
    if (!content) return ''
    return content
      // Convert \( ... \) to inline math for remark-math
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => `$${expr.trim()}$`)
      // Convert \[ ... \] to block math for remark-math
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => `\n$$\n${expr.trim()}\n$$\n`)
  }, [content])

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h2: ({ children }) => <h2 className="text-base font-black mt-4 mb-2 text-gray-900">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1.5 text-gray-800">{children}</h3>,
        strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
        li: ({ children }) => <li className="text-[16px] leading-relaxed">{children}</li>,
        p: ({ children }) => <p className="text-[16px] leading-relaxed mb-2 last:mb-0">{children}</p>,
        code: ({ inline, children }) =>
          inline
            ? <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>
            : <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-[13px] font-mono overflow-x-auto my-3 leading-relaxed">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-amber-400 pl-4 my-3 text-gray-600 italic bg-amber-50/50 py-2 rounded-r-lg">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-gray-200" />,
      }}
    >
      {normalizedContent}
    </ReactMarkdown>
  )
}

// ── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[82%] md:max-w-[58%] ${isUser ? 'self-end items-end text-right' : 'self-start items-start text-left'} flex flex-col gap-1 min-w-0`}>
        {msg.image && (
          <img
            src={msg.image}
            alt="Uploaded"
            className="rounded-xl max-h-64 object-contain mb-1"
          />
        )}
        <div
          className={`px-3 py-2 text-[17px] leading-relaxed text-gray-900 ${
            isUser ? 'rounded-xl' : ''
          }`}
          style={isUser ? { backgroundColor: '#F4F4F4' } : undefined}
        >
          {isUser
            ? <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
            : <div className="break-words [overflow-wrap:anywhere]"><MessageContent content={msg.content} /></div>
          }
        </div>
        <span className="text-[10px] text-gray-400 px-1">
          {new Date(msg.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

// ── Typing indicator ────────────────────────────────────────────────────────
function TypingBubble({ streamText }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[80%] px-0 py-0 text-[17px] text-gray-900">
        {streamText
          ? <MessageContent content={streamText + '▋'} />
          : (
            <p className="text-gray-500">...</p>
          )
        }
      </div>
    </motion.div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AIChatPage() {
  const [searchParams] = useSearchParams()
  const initSubject = (searchParams.get('subject') || 'SAT').toUpperCase()
  const initSection = searchParams.get('section') || 'general'

  const [subject, setSubject] = useState(initSubject)
  const [section, setSection] = useState(initSection)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('chat')

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const colorCls = COLOR[SUBJECTS[subject]?.color || 'sky']

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  // Load conversation history list
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get(`/ai/conversations/?subject=${subject}`)
      setConversations(res.data)
    } catch {}
  }, [subject])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Load specific conversation
  const loadConversation = async (id) => {
    try {
      const res = await api.get(`/ai/conversations/${id}/`)
      setConversationId(res.data.id)
      setSubject(res.data.subject)
      setSection(res.data.section)
      setMessages(res.data.messages)
      setShowHistory(false)
    } catch {}
  }

  // New chat
  const newChat = () => {
    setMessages([])
    setConversationId(null)
    setInput('')
    setImage(null)
    setImagePreview(null)
  }

  // Delete conversation
  const deleteConversation = async (id, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/ai/conversations/${id}/`)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (conversationId === id) newChat()
    } catch {}
  }

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFromFile(file)
  }

  const setImageFromFile = (file) => {
    setImage(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // Handle Ctrl+V paste (images)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    for (const item of items || []) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) { setImageFromFile(file); e.preventDefault() }
        break
      }
    }
  }

  // Send message
  const sendMessage = async () => {
    if ((!input.trim() && !image) || streaming) return

    const userContent = input.trim()
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userContent,
      image: imagePreview,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setImage(null)
    setImagePreview(null)
    setStreaming(true)
    setStreamText('')

    try {
      const formData = new FormData()
      formData.append('subject', subject)
      formData.append('section', section)
      formData.append('message', userContent)
      if (conversationId) formData.append('conversation_id', conversationId)
      if (image) formData.append('image', image)

      const response = await fetch('/api/ai/chat/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Server error ${response.status}: ${errText.slice(0, 200)}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event
          try { event = JSON.parse(line.slice(6)) } catch { continue }

          if (event.type === 'conversation_id') {
            setConversationId(event.id)
          } else if (event.type === 'delta') {
            fullText += event.text
            setStreamText(fullText)
          } else if (event.type === 'done') {
            const aiMsg = {
              id: Date.now() + 1,
              role: 'assistant',
              content: fullText,
              created_at: new Date().toISOString(),
            }
            setMessages(prev => [...prev, aiMsg])
            setStreamText('')
            setStreaming(false)
            loadConversations()
          } else if (event.type === 'error') {
            throw new Error(event.message || 'AI error')
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Sorry, an error occurred: ${err.message}. Please try again.`,
        created_at: new Date().toISOString(),
      }])
      setStreamText('')
      setStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const subjectInfo = SUBJECTS[subject]
  const sectionInfo = subjectInfo?.sections.find(s => s.key === section)

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">

      {/* ── Sidebar: History ── */}
      <div className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-0 overflow-hidden border-r-0'}`}>
        <div className="p-4">
          <button
            onClick={newChat}
            className="w-full h-9 rounded-xl border border-gray-300 bg-white text-gray-700 text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
          >
            <Plus size={16} />
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {conversations.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">No conversations yet</p>
          )}
          {conversations.map(c => (
            <div key={c.id}
              onClick={() => loadConversation(c.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                conversationId === c.id ? 'bg-white text-gray-900' : 'hover:bg-white/80 text-gray-800'
              }`}>
              <span className="flex-1 text-[14px] truncate">{c.title || 'Untitled'}</span>
              <button
                onClick={(e) => deleteConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white py-4 px-4 flex items-center justify-center relative">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="absolute left-4 w-11 h-11 rounded-xl bg-[#2f2f2f] text-white flex items-center justify-center hover:bg-[#3a3a3a] transition"
            title={sidebarOpen ? 'Hide chats' : 'Show chats'}
          >
            <PanelLeft size={18} />
          </button>
          <div className="inline-flex items-center bg-gray-200 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-16 py-1.5 rounded-xl text-[15px] font-semibold transition ${
                activeTab === 'chat' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-700'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`px-10 py-1.5 rounded-xl text-[15px] font-semibold transition ${
                activeTab === 'video' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-700'
              }`}
            >
              AI video explanation
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-white">
          {activeTab === 'video' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={26} className="text-gray-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">Coming soon</h2>
                <p className="text-gray-500 mt-2 text-sm">
                  AI video explanation is being prepared.
                </p>
              </div>
            </div>
          )}
          {activeTab === 'chat' && (
            <>
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-20">
              <div className={`w-16 h-16 rounded-2xl ${colorCls.bg} flex items-center justify-center shadow-lg`}>
                <Sparkles size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">AI Tutor</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-md">
                  {subject === 'SAT' && 'Ask about any SAT topic — math problems, reading strategies, grammar rules, or get example questions.'}
                  {subject === 'IELTS' && 'Get help with IELTS writing samples, speaking strategies, reading techniques, and listening tips.'}
                  {subject === 'CEFR' && 'Learn English grammar, get reading & listening help, and practice at your CEFR level.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {subject === 'SAT' && [
                  'Explain quadratic equations',
                  'Give me a Reading & Writing example',
                  'What is Information and Ideas?',
                  'Solve this math problem for me',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-xs px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
                    {s}
                  </button>
                ))}
                {subject === 'IELTS' && [
                  'Write a band 9 Task 2 essay on education',
                  'How to answer True/False/Not Given?',
                  'IELTS Speaking Part 2 tips',
                  'Describe a bar chart for Task 1',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-xs px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
                    {s}
                  </button>
                ))}
                {subject === 'CEFR' && [
                  'Explain present perfect vs past simple',
                  'Give me B2 grammar exercises',
                  'What is C1 level vocabulary?',
                  'Reading strategies for CEFR tests',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-xs px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {streaming && (
            <TypingBubble streamText={streamText} />
          )}

          <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        {activeTab === 'chat' && (
        <div className="flex-shrink-0 bg-white p-4 pb-6">
          {/* Image preview */}
          {imagePreview && (
            <div className="mb-3 flex items-start gap-2">
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="h-20 rounded-xl border border-gray-200 object-contain" />
                <button
                  onClick={() => { setImage(null); setImagePreview(null) }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          )}

          <div className={`mx-auto max-w-3xl flex items-end gap-2 bg-white rounded-2xl border transition-all ${
            streaming ? 'border-gray-200' : 'border-gray-300'
          } p-2.5`}>
            {/* Image upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              className="flex-shrink-0 p-2 rounded-full border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
              title="Upload image"
            >
              <ImageIcon size={15} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Write your question..."
              disabled={streaming}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400 py-2 px-1 max-h-32 disabled:opacity-50"
              style={{ minHeight: '36px' }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
              }}
            />

            <button
              disabled={streaming}
              className="flex-shrink-0 p-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
              title="Voice input"
            >
              <Mic size={15} />
            </button>

            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={streaming || (!input.trim() && !image)}
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                streaming || (!input.trim() && !image)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-violet-300 text-white hover:opacity-90 shadow-sm'
              }`}
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
