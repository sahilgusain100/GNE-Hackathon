import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, Sparkles, X, ChevronRight } from 'lucide-react'
import ArtisanVoiceAssistantDrawer from './ArtisanVoiceAssistantDrawer'
import { useAuthDialog } from '../../hooks/useAuthDialog'

const FloatingRobotWidget = ({ user: propUser }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showBubble, setShowBubble] = useState(true)
  const [initialQuery, setInitialQuery] = useState('')
  const [eyeBlink, setEyeBlink] = useState(false)
  const { currentUser } = useAuthDialog()
  const location = useLocation()

  const activeUser = propUser || currentUser
  const pathname = location?.pathname || ''

  // Eye blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeBlink(true)
      setTimeout(() => setEyeBlink(false), 220)
    }, 4000)
    return () => clearInterval(blinkInterval)
  }, [])

  // Listen to global open event
  useEffect(() => {
    const handleOpen = (e) => {
      if (e?.detail?.query) {
        setInitialQuery(e.detail.query)
      }
      setIsOpen(true)
    }
    window.addEventListener('open-voice-assistant', handleOpen)
    return () => window.removeEventListener('open-voice-assistant', handleOpen)
  }, [])

  // Auto-dismiss the greeting speech bubble after 14 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBubble(false)
    }, 14000)
    return () => clearTimeout(timer)
  }, [pathname])

  // Context-aware speech bubble copy and quick chips
  const mascotGreeting = useMemo(() => {
    if (activeUser?.accountType === 'artisan') {
      return {
        title: 'Artisan AI Studio',
        subtitle: 'Orders · Products · Earnings',
        punjabi: 'ਬੋਲ ਕੇ ਆਰਡਰ ਤੇ ਉਤਪਾਦ ਸੰਭਾਲੋ',
        chips: [
          { label: '📦 ਨਵਾਂ ਉਤਪਾਦ', query: 'Add a new product' },
          { label: '📋 ਪੈਂਡਿੰਗ ਆਰਡਰ', query: 'Show my pending orders' },
          { label: '💰 ਕੁੱਲ ਕਮਾਈ', query: 'How much have I earned?' },
        ],
      }
    }
    if (activeUser?.accountType === 'customer') {
      return {
        title: 'Craft Assistant',
        subtitle: 'Shop · Track Orders · Support',
        punjabi: 'ਮਾਰਕੀਟਪਲੇਸ, ਆਰਡਰ ਤੇ ਸਹਾਇਤਾ',
        chips: [
          { label: '🛍️ ਉਤਪਾਦ ਦੇਖੋ', query: 'Show me products' },
          { label: '📦 ਆਰਡਰ ਟ੍ਰੈਕ ਕਰੋ', query: 'Track my order' },
          { label: '💬 ਸਹਾਇਤਾ ਕੇਂਦਰ', query: 'Contact support' },
        ],
      }
    }
    if (pathname.includes('/artisan/auth')) {
      return {
        title: 'Artisan Onboarding',
        subtitle: 'Hands-free Voice Registration',
        punjabi: 'ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰੋ ਜਾਂ ਲੌਗਇਨ',
        chips: [
          { label: '🎙️ ਬੋਲ ਕੇ ਰਜਿਸਟਰ', query: 'I want to register as an artisan' },
          { label: '🔑 ਲੌਗਇਨ ਮਦਦ', query: 'How to login as an artisan' },
          { label: 'ℹ️ ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ?', query: 'What is SkillBridge?' },
        ],
      }
    }
    if (pathname.includes('/industry/auth') || activeUser?.accountType === 'industry') {
      return {
        title: 'Industry Partner AI',
        subtitle: 'B2B Artisan Contracts & Projects',
        punjabi: 'ਉਦਯੋਗਿਕ ਪ੍ਰੋਜੈਕਟ ਸਹਾਇਕ',
        chips: [
          { label: '🏭 ਓਪਨ ਪ੍ਰੋਜੈਕਟ', query: 'Find open industrial projects' },
          { label: '🤝 ਦਸਤਕਾਰ ਲੱਭੋ', query: 'Find skilled artisans' },
          { label: '💬 ਸਹਾਇਤਾ', query: 'Contact support' },
        ],
      }
    }
    return {
      title: 'SkillBridge Mascot',
      subtitle: 'Ask anything or talk by voice',
      punjabi: 'ਮੈਂ ਤੁਹਾਡੀ ਹਰ ਕੰਮ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ',
      chips: [
        { label: '🎙️ ਬੋਲ ਕੇ ਰਜਿਸਟਰ', query: 'I want to register as an artisan' },
        { label: '🛍️ ਮਾਰਕੀਟਪਲੇਸ', query: 'Show me products' },
        { label: '❓ ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ?', query: 'What is SkillBridge?' },
      ],
    }
  }, [activeUser, pathname])

  const handleChipClick = (query) => {
    setInitialQuery(query)
    setIsOpen(true)
    setShowBubble(false)
  }

  return (
    <>
      {/* Floating launcher button at bottom-right corner of viewport */}
      <aside
        aria-label="SkillBridge AI Assistant Mascot"
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto"
      >
        {/* Animated Contextual Speech Bubble / Mascot Callout */}
        {showBubble && !isOpen && (
          <div className="relative max-w-xs animate-bounce-subtle rounded-3xl border border-secondary/40 bg-surface/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300">
            <button
              aria-label="Dismiss message"
              className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-muted text-text-muted hover:text-text-main hover:bg-surface shadow-xs text-[10px] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setShowBubble(false)
              }}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>

            <div
              className="cursor-pointer"
              onClick={() => {
                setIsOpen(true)
                setShowBubble(false)
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-secondary">
                <Sparkles className="h-3 w-3 text-secondary animate-spin-slow" />
                <span>{mascotGreeting.title}</span>
              </div>
              <p className="mt-0.5 text-xs font-bold text-text-main">
                {mascotGreeting.subtitle}
              </p>
              <p className="mt-0.5 text-[0.72rem] text-primary font-medium">
                {mascotGreeting.punjabi}
              </p>
            </div>

            {/* Quick Interactive Prompt Chips inside Bubble */}
            {mascotGreeting.chips && mascotGreeting.chips.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-border/60 flex flex-wrap gap-1.5">
                {mascotGreeting.chips.map((chip, idx) => (
                  <button
                    className="inline-flex items-center gap-1 rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary hover:bg-secondary hover:text-white transition cursor-pointer"
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChipClick(chip.query)
                    }}
                    type="button"
                  >
                    <span>{chip.label}</span>
                    <ChevronRight className="h-2.5 w-2.5 opacity-70" />
                  </button>
                ))}
              </div>
            )}

            {/* Speech tail pointing down towards the Mascot */}
            <div className="absolute -bottom-2 right-8 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-surface/95" />
          </div>
        )}

        {/* Mascot Robot Launcher Button with Animated Character */}
        <button
          aria-label="Open SkillBridge AI Mascot & Voice Assistant"
          className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-primary via-primary-hover to-secondary py-2 pl-2.5 pr-4 text-white shadow-2xl ring-4 ring-secondary/25 transition-all duration-300 hover:scale-105 hover:shadow-primary/40 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary cursor-pointer"
          onClick={() => {
            setIsOpen(true)
            setShowBubble(false)
          }}
          type="button"
        >
          {/* Animated Ambient Pulsing Aura */}
          <span className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-secondary/50 via-primary/30 to-accent/40 blur-md animate-pulse -z-10" />

          {/* Animated Mini Mascot SVG Robot Face */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 border-2 border-amber-400/60 shadow-inner overflow-visible">
            <svg
              className="h-9 w-9 transition-transform duration-300 group-hover:scale-110"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Antenna */}
              <line stroke="#94A3B8" strokeLinecap="round" strokeWidth="4" x1="50" x2="50" y1="22" y2="8" />
              <circle className="animate-pulse" cx="50" cy="7" fill="#10B981" r="5" />
              <circle cx="50" cy="7" fill="#FFFFFF" r="2" />

              {/* Head Body */}
              <rect fill="#1E293B" height="52" rx="16" stroke="#334155" strokeWidth="3" width="70" x="15" y="24" />

              {/* Ears */}
              <rect fill="#F59E0B" height="18" rx="4" width="8" x="8" y="40" />
              <rect fill="#F59E0B" height="18" rx="4" width="8" x="84" y="40" />

              {/* Visor Screen */}
              <rect fill="#0F172A" height="34" rx="10" stroke="#0284C7" strokeWidth="2" width="56" x="22" y="32" />

              {/* Glowing Eyes */}
              {eyeBlink ? (
                // Blinking (closed line)
                <>
                  <line stroke="#38BDF8" strokeLinecap="round" strokeWidth="3" x1="32" x2="44" y1="48" y2="48" />
                  <line stroke="#38BDF8" strokeLinecap="round" strokeWidth="3" x1="56" x2="68" y1="48" y2="48" />
                </>
              ) : (
                // Open smiling eyes
                <>
                  <circle cx="38" cy="46" fill="#38BDF8" r="6" />
                  <circle cx="40" cy="44" fill="#FFFFFF" r="2" />
                  <circle cx="62" cy="46" fill="#38BDF8" r="6" />
                  <circle cx="64" cy="44" fill="#FFFFFF" r="2" />
                </>
              )}

              {/* Friendly LED Smile */}
              <path d="M42 56 Q50 62 58 56" fill="none" stroke="#38BDF8" strokeLinecap="round" strokeWidth="2.5" />
            </svg>

            {/* Glowing Live Indicator on Corner */}
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>

          {/* Mascot Info Badge */}
          <div className="text-left hidden sm:block pr-1">
            <div className="flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider text-accent-light">
              <MessageCircle className="h-2.5 w-2.5" />
              <span>SkillBridge AI</span>
            </div>
            <p className="text-xs font-bold leading-tight text-white flex items-center gap-1.5">
              <span>Mascot Assistant</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </p>
          </div>
        </button>
      </aside>

      {/* Slide-over Conversation Drawer */}
      <ArtisanVoiceAssistantDrawer
        initialQuery={initialQuery}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          setInitialQuery('')
        }}
        user={activeUser}
      />
    </>
  )
}

export default FloatingRobotWidget
