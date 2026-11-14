import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mic,
  Package,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import RobotAvatar from './RobotAvatar'
import VoiceWaveform from './VoiceWaveform'
import { sendVoiceAssistantMessageApi } from '../../services/voice-api'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthDialog } from '../../hooks/useAuthDialog'

const LANGUAGE_LOCALES = {
  pa: 'pa-IN',
  hi: 'hi-IN',
  en: 'en-IN',
}

const LANGUAGES = [
  { code: 'pa', name: 'ਪੰਜਾਬੀ', label: 'Punjabi', flag: '🇮🇳' },
  { code: 'hi', name: 'हिंदी', label: 'Hindi', flag: '🇮🇳' },
  { code: 'en', name: 'English', label: 'English', flag: '🇬🇧' },
]

function getWelcomeContent(lang, activeUser, path = '') {
  if (activeUser?.accountType === 'artisan') {
    return {
      text:
        lang === 'pa'
          ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${activeUser.name} ਜੀ! ਮੈਂ ਤੁਹਾਡਾ ਸਕਿੱਲਬ੍ਰਿਜ AI ਮੈਸਕੌਟ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਆਵਾਜ਼ ਵਿੱਚ ਕਹਿ ਸਕਦੇ ਹੋ: 'ਨਵਾਂ ਉਤਪਾਦ ਜੋੜੋ', 'ਪੈਂਡਿੰਗ ਆਰਡਰ ਦਿਖਾਓ', 'ਮੇਰੀ ਕਮਾਈ', ਜਾਂ 'ਉਦਯੋਗ ਪ੍ਰੋਜੈਕਟ ਲੱਭੋ'!`
          : lang === 'hi'
          ? `नमस्ते ${activeUser.name} जी! मैं आपका स्किलब्रिज AI सहायक हूँ। आप बोल सकते हैं: 'नया उत्पाद जोड़ो', 'पेंडिंग ऑर्डर बताओ', 'मेरी कमाई', या 'उद्योग प्रोजेक्ट ढूँढो'!`
          : `Hello ${activeUser.name}! I am your SkillBridge AI Mascot. You can speak commands like 'Add product', 'Check pending orders', 'What are my earnings?', or 'Find industrialists'!`,
      speechText:
        lang === 'pa'
          ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${activeUser.name} ਜੀ! ਮੈਂ ਤੁਹਾਡਾ ਸਕਿੱਲਬ੍ਰਿਜ AI ਮੈਸਕੌਟ ਹਾਂ। ਦੱਸੋ ਅੱਜ ਮੈਂ ਕੀ ਮਦਦ ਕਰਾਂ?`
          : `Hello ${activeUser.name}! I am your assistant. How can I help you today?`,
    }
  }

  if (activeUser?.accountType === 'customer') {
    return {
      text:
        lang === 'pa'
          ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${activeUser.name} ਜੀ! ਮੈਂ ਸਕਿੱਲਬ੍ਰਿਜ ਦਾ AI ਮੈਸਕੌਟ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਉਤਪਾਦ ਖੋਜਣ ('ਫੁਲਕਾਰੀ ਦਿਖਾਓ'), ਆਰਡਰ ਟ੍ਰੈਕ ਕਰਨ ('ਮੇਰਾ ਆਰਡਰ ਟ੍ਰੈਕ ਕਰੋ'), ਜਾਂ ਗਾਹਕ ਸਹਾਇਤਾ ਲਈ ਕਹਿ ਸਕਦੇ ਹੋ!`
          : lang === 'hi'
          ? `नमस्ते ${activeUser.name} जी! मैं आपका स्किलब्रिज AI सहायक हूँ। आप मुझसे हस्तशिल्प खोजने, ऑर्डर ट्रैक करने, या सहायता केंद्र के लिए बोल सकते हैं!`
          : `Hello ${activeUser.name}! I am your SkillBridge AI Mascot. You can ask me to discover handmade crafts, track your delivery status, or get help with returns and customer support!`,
      speechText:
        lang === 'pa'
          ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${activeUser.name} ਜੀ! ਮੈਂ ਤੁਹਾਡੀ ਹਰ ਕੰਮ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ।`
          : `Hello ${activeUser.name}! I am your craft assistant. How can I help you today?`,
    }
  }

  if (path.includes('/artisan/auth')) {
    return {
      text:
        lang === 'pa'
          ? "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਤੁਹਾਡਾ ਸਕਿੱਲਬ੍ਰਿਜ ਮੈਸਕੌਟ ਤੇ ਸਹਾਇਕ ਹਾਂ। ਕੀ ਤੁਸੀਂ ਦਸਤਕਾਰ ਵਜੋਂ ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰਨਾ ਜਾਂ ਲੌਗਇਨ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? ਮੈਂ ਤੁਹਾਡੀ ਹਰ ਕੰਮ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ।"
          : lang === 'hi'
          ? "नमस्ते जी! मैं आपका स्किलब्रिज सहायक हूँ। क्या आप बोलकर रजिस्ट्रेशन या लॉगिन करना चाहते हैं? मैं आपकी पूरी मदद करूँगा।"
          : "Hello! Welcome to Artisan Onboarding. You can register hands-free simply by speaking in Punjabi, Hindi, or English, or ask for login assistance.",
      speechText:
        lang === 'pa'
          ? "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਕੀ ਤੁਸੀਂ ਦਸਤਕਾਰ ਵਜੋਂ ਰਜਿਸਟਰ ਕਰਨਾ ਜਾਂ ਲੌਗਇਨ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? ਮੈਂ ਤੁਹਾਡੀ ਮਦਦ ਕਰਾਂਗਾ।"
          : "Hello! Need help logging in or registering by voice? Talk to me directly.",
    }
  }

  if (path.includes('/industry/auth') || activeUser?.accountType === 'industry') {
    return {
      text:
        lang === 'pa'
          ? "ਜੀ ਆਇਆਂ ਨੂੰ! ਉਦਯੋਗਿਕ ਭਾਈਵਾਲੀ, ਬਲਕ ਆਰਡਰਾਂ ਜਾਂ ਦਸਤਕਾਰਾਂ ਨਾਲ ਸਿੱਧੇ ਕੰਟਰੈਕਟਾਂ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ।"
          : "Welcome Industry Partners! Ask me about B2B collaborations, bulk artisan contracts, or logging in.",
      speechText: "Welcome! How can I assist you with industrial partnerships today?",
    }
  }

  return {
    text:
      lang === 'pa'
        ? "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਸਕਿੱਲਬ੍ਰਿਜ ਦਾ 24/7 AI ਮੈਸਕੌਟ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਉਤਪਾਦ ਖੋਜਣ, ਆਰਡਰ ਟ੍ਰੈਕ ਕਰਨ, ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰਨ, ਜਾਂ ਗਾਹਕ ਸਹਾਇਤਾ ਲਈ ਕਹਿ ਸਕਦੇ ਹੋ।"
        : lang === 'hi'
        ? "नमस्ते जी! मैं स्किलब्रिज का 24/7 AI मैस्कॉट हूँ। आप मुझसे हस्तशिल्प खोजने, ऑर्डर ट्रैक करने, बोलकर कारीगर रजिस्ट्रेशन, या सहायता के बारे में पूछ सकते हैं।"
        : "Hello! I am your SkillBridge AI Mascot & Assistant. Ask me how to discover authentic crafts, track deliveries, register hands-free as an artisan, or get 24/7 support!",
    speechText:
      lang === 'pa'
        ? "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਸਕਿੱਲਬ੍ਰਿਜ ਸਹਾਇਕ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਹਰ ਕੰਮ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ।"
        : "Hello! I am your SkillBridge assistant. I can help you with anything across the platform.",
  }
}

const ArtisanVoiceAssistantDrawer = ({ isOpen, onClose, user: propUser, initialQuery = '' }) => {
  const [language, setLanguage] = useState('pa')
  const navigate = useNavigate()
  const location = useLocation()
  const { openAuth, currentUser } = useAuthDialog()

  const activeUser = propUser || currentUser
  const pathname = location?.pathname || ''

  const initialWelcome = useMemo(() => {
    const welcome = getWelcomeContent(language, activeUser, pathname)
    return {
      id: 'welcome',
      sender: 'assistant',
      text: welcome.text,
      speechText: welcome.speechText,
      actionData: null,
      timestamp: new Date(),
    }
  }, [language, activeUser, pathname])

  const [messages, setMessages] = useState([initialWelcome])
  const [inputMessage, setInputMessage] = useState('')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [robotState, setRobotState] = useState('idle') // 'idle' | 'speaking' | 'listening' | 'processing' | 'success'
  const [isMouthMoving, setIsMouthMoving] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [lastSpokenText, setLastSpokenText] = useState('')
  const [micError, setMicError] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Auto-scroll chat to bottom
  const chatBottomRef = useRef(null)
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)
  const isSpeakingRef = useRef(false)

  // Refresh welcome message if opened on a new page or language changed
  useEffect(() => {
    if (isOpen) {
      setMessages((prev) => {
        if (prev.length <= 1) {
          const fresh = getWelcomeContent(language, activeUser, pathname)
          return [
            {
              id: 'welcome',
              sender: 'assistant',
              text: fresh.text,
              speechText: fresh.speechText,
              actionData: null,
              timestamp: new Date(),
            },
          ]
        }
        return prev
      })
    }
  }, [isOpen, language, activeUser, pathname])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveTranscript, pendingAction])

  // Stop all audio & speech recognition
  const stopAudio = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    isSpeakingRef.current = false
    setIsMouthMoving(false)
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (_) {}
      isListeningRef.current = false
    }
    if (robotState === 'speaking' || robotState === 'listening') {
      setRobotState('idle')
    }
  }, [robotState])

  // Speak text via browser SpeechSynthesis
  const speakResponse = useCallback(
    (text, onComplete) => {
      if (isMuted || !text || typeof window === 'undefined' || !window.speechSynthesis) {
        if (onComplete) onComplete()
        return
      }

      stopAudio()
      setRobotState('speaking')
      setIsMouthMoving(true)
      isSpeakingRef.current = true
      setLastSpokenText(text)

      // Clean speech text thoroughly (no markdown stars, links, brackets)
      const cleanSpoken = text
        .replace(/[*_#`~[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/₹\s*/g, 'Rupees ')
        .replace(/\s+/g, ' ')
        .trim()

      const utterance = new SpeechSynthesisUtterance(cleanSpoken)
      utterance.lang = LANGUAGE_LOCALES[language] || 'pa-IN'
      utterance.rate = 0.95
      utterance.pitch = 1.05

      // Select regional voice
      const voices = window.speechSynthesis.getVoices()
      const langPrefix = language === 'pa' ? 'pa' : language === 'hi' ? 'hi' : 'en'
      const matched = voices.find(
        (v) =>
          v.lang &&
          (v.lang.toLowerCase().startsWith(langPrefix) ||
            v.lang.toLowerCase().includes('in'))
      )
      if (matched) utterance.voice = matched

      utterance.onstart = () => {
        setIsMouthMoving(true)
        setRobotState('speaking')
      }

      utterance.onboundary = () => {
        setIsMouthMoving((prev) => !prev)
        setTimeout(() => setIsMouthMoving(true), 60)
      }

      utterance.onend = () => {
        isSpeakingRef.current = false
        setIsMouthMoving(false)
        setRobotState('idle')
        if (onComplete) onComplete()
      }

      utterance.onerror = () => {
        isSpeakingRef.current = false
        setIsMouthMoving(false)
        setRobotState('idle')
        if (onComplete) onComplete()
      }

      // Safety duration timeout
      const duration = Math.max(3000, cleanSpoken.length * 85)
      setTimeout(() => {
        if (isSpeakingRef.current) {
          isSpeakingRef.current = false
          setIsMouthMoving(false)
          setRobotState('idle')
        }
      }, duration + 2000)

      window.speechSynthesis.speak(utterance)
    },
    [isMuted, language, stopAudio]
  )

  // Send message to backend assistant
  const handleSendMessage = useCallback(
    async (textToSend) => {
      const msg = (textToSend || inputMessage).trim()
      if (!msg) return

      stopAudio()
      setInputMessage('')
      setLiveTranscript('')
      setRobotState('processing')

      // Add user message to UI
      const userMsgObj = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: msg,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsgObj])

      try {
        const historyPayload = messages.slice(-6).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }))

        const res = await sendVoiceAssistantMessageApi({
          message: msg,
          conversationHistory: historyPayload,
          pendingAction,
          language,
        })

        if (!res?.success) {
          throw new Error(res?.message || 'Assistant request failed')
        }

        const assistantMsgObj = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: res.reply,
          speechText: res.speechText || res.reply,
          actionData: res.actionData || null,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMsgObj])
        setPendingAction(res.pendingAction || null)
        setRobotState('idle')

        // Speak response out loud
        speakResponse(res.speechText || res.reply)
      } catch (err) {
        console.error('Assistant error:', err)
        const errMsg =
          language === 'pa'
            ? 'ਮਾਫ਼ ਕਰਨਾ, ਕੋਈ ਤਕਨੀਕੀ ਖਰਾਬੀ ਆਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
            : language === 'hi'
            ? 'क्षमा करें, कोई तकनीकी समस्या आई है। कृपया पुनः प्रयास करें।'
            : 'Sorry, something went wrong. Please try again.'

        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: errMsg,
            isError: true,
            timestamp: new Date(),
          },
        ])
        setRobotState('idle')
        speakResponse(errMsg)
      }
    },
    [inputMessage, messages, pendingAction, language, stopAudio, speakResponse]
  )

  // Execute initial query if passed
  useEffect(() => {
    if (isOpen && initialQuery) {
      const timer = setTimeout(() => {
        handleSendMessage(initialQuery)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialQuery, handleSendMessage])

  // Start Speech-to-Text Recognition
  const startListening = useCallback(() => {
    stopAudio()
    setMicError('')
    setLiveTranscript('')

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setMicError(
        language === 'pa'
          ? 'ਬ੍ਰਾਉਜ਼ਰ ਸਪੀਚ ਰਿਕੋਗਨੀਸ਼ਨ ਦਾ ਸਮਰਥਨ ਨਹੀਂ ਕਰਦਾ। ਕਿਰਪਾ ਕਰਕੇ Google Chrome ਵਰਤੋ ਜਾਂ ਹੇਠਾਂ ਟਾਈਪ ਕਰੋ।'
          : 'Your browser does not support Speech Recognition. Please use Chrome or type below.'
      )
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.lang = LANGUAGE_LOCALES[language] || 'pa-IN'
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onstart = () => {
        isListeningRef.current = true
        setRobotState('listening')
      }

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            final += transcript
          } else {
            interim += transcript
          }
        }

        const currentText = (final || interim).trim()
        setLiveTranscript(currentText)

        if (final.trim()) {
          recognition.stop()
          handleSendMessage(final.trim())
        }
      }

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error)
        isListeningRef.current = false
        if (event.error === 'not-allowed') {
          setMicError(
            language === 'pa'
              ? 'ਕਿਰਪਾ ਕਰਕੇ ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ ਜੀ।'
              : 'Please allow microphone access in your browser settings.'
          )
        }
        setRobotState('idle')
      }

      recognition.onend = () => {
        isListeningRef.current = false
        if (robotState === 'listening') {
          setRobotState('idle')
        }
      }

      recognition.start()
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setMicError(err.message)
      setRobotState('idle')
    }
  }, [language, robotState, stopAudio, handleSendMessage])

  // Handle Action Navigation
  const handleNavigationAction = useCallback(
    (nav) => {
      if (!nav) return
      stopAudio()
      onClose()

      if (nav.triggerVoiceSignup) {
        if (pathname.includes('/artisan/auth')) {
          window.dispatchEvent(new CustomEvent('open-voice-signup'))
        } else {
          navigate('/artisan/auth?mode=signup&method=voice')
        }
        return
      }

      if (nav.openAuth && openAuth) {
        openAuth(nav.openAuth)
        return
      }

      if (nav.path) {
        navigate(nav.path)
      }
    },
    [stopAudio, onClose, pathname, navigate, openAuth]
  )

  const handleCopyMessage = (id, text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClearChat = () => {
    stopAudio()
    const fresh = getWelcomeContent(language, activeUser, pathname)
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: fresh.text,
        speechText: fresh.speechText,
        actionData: null,
        timestamp: new Date(),
      },
    ])
    setPendingAction(null)
  }

  // Role-aware Suggestion Chips
  const suggestionChips = useMemo(() => {
    if (activeUser?.accountType === 'artisan') {
      return [
        { label: '📦 ਨਵਾਂ ਉਤਪਾਦ (Add Product)', command: 'Add a new product' },
        { label: '📋 ਪੈਂਡਿੰਗ ਆਰਡਰ (Pending Orders)', command: 'Show my pending orders' },
        { label: '💰 ਕੁੱਲ ਕਮਾਈ (Earnings)', command: 'How much have I earned?' },
        { label: '🏭 ਉਦਯੋਗ ਪ੍ਰੋਜੈਕਟ (Industries)', command: 'Find industrialists' },
        { label: '💬 ਸਹਾਇਤਾ ਕੇਂਦਰ (Support)', command: 'Open support' },
      ]
    }
    if (activeUser?.accountType === 'customer') {
      return [
        { label: '🛍️ ਉਤਪਾਦ ਦੇਖੋ (Browse Crafts)', command: 'Show me products' },
        { label: '📦 ਆਰਡਰ ਟ੍ਰੈਕ ਕਰੋ (Track Order)', command: 'Track my order' },
        { label: '🛡️ ਵਾਪਸੀ ਤੇ ਸਹਾਇਤਾ (Support)', command: 'Help with return or refund' },
        { label: '❓ ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ? (About)', command: 'What is SkillBridge?' },
      ]
    }
    if (pathname.includes('/artisan/auth')) {
      return [
        { label: '🎙️ ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰੋ (Voice Signup)', command: 'I want to register as an artisan' },
        { label: '🔑 ਲੌਗਇਨ ਕਰੋ (Artisan Login)', command: 'I want to log in as an artisan' },
        { label: 'ℹ️ ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ? (What is SkillBridge?)', command: 'What is SkillBridge?' },
      ]
    }
    if (pathname.includes('/industry/auth') || activeUser?.accountType === 'industry') {
      return [
        { label: '🏭 B2B ਪ੍ਰੋਜੈਕਟ (Projects)', command: 'Find open industrial projects' },
        { label: '🤝 ਦਸਤਕਾਰ ਲੱਭੋ (Artisans)', command: 'Find skilled artisans' },
        { label: '💬 ਸਹਾਇਤਾ (Support)', command: 'Open support desk' },
      ]
    }
    return [
      { label: '🎙️ ਦਸਤਕਾਰ ਰਜਿਸਟ੍ਰੇਸ਼ਨ (Voice Signup)', command: 'I want to register as an artisan' },
      { label: '🛍️ ਮਾਰਕੀਟਪਲੇਸ (Marketplace)', command: 'Show me products' },
      { label: '📦 ਆਰਡਰ ਟ੍ਰੈਕ ਕਰੋ (Track Order)', command: 'Track my order' },
      { label: '❓ ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ? (About)', command: 'What is SkillBridge?' },
      { label: '💬 ਸਹਾਇਤਾ ਕੇਂਦਰ (Support)', command: 'Contact support' },
    ]
  }, [activeUser, pathname])

  // Context-aware Header Badge
  const headerInfo = useMemo(() => {
    if (activeUser?.accountType === 'artisan') {
      return {
        title: 'Artisan AI Studio',
        subtitle: 'Voice Shop · Orders · Products · Earnings',
      }
    }
    if (activeUser?.accountType === 'customer') {
      return {
        title: 'Craft Assistant',
        subtitle: 'Shopping · Live Order Tracking · Support',
      }
    }
    if (activeUser?.accountType === 'industry') {
      return {
        title: 'Industry Partner AI',
        subtitle: 'B2B Projects · Bulk Orders · Artisans',
      }
    }
    return {
      title: 'SkillBridge AI Mascot',
      subtitle: 'Multilingual Voice & Smart Platform Assistant',
    }
  }, [activeUser])

  if (!isOpen) return null

  return (
    <div
      aria-label="SkillBridge AI Assistant Mascot"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
      role="dialog"
    >
      <div className="relative flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl border-l border-border transition-transform duration-300 sm:max-w-md md:max-w-lg">
        {/* 1. Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-surface-muted/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-xs">
              <Bot className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-surface animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-surface" />
            </span>
            <div>
              <h2 className="font-serif text-sm sm:text-base font-bold text-text-main flex items-center gap-1.5">
                <span>{headerInfo.title}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </h2>
              <p className="text-[0.66rem] text-secondary font-semibold uppercase tracking-wider">
                {headerInfo.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <div className="flex items-center gap-0.5 rounded-full bg-surface border border-border p-0.5 shadow-2xs">
              {LANGUAGES.map((l) => (
                <button
                  className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold transition-all cursor-pointer ${
                    language === l.code
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                  key={l.code}
                  onClick={() => {
                    stopAudio()
                    setLanguage(l.code)
                  }}
                  type="button"
                >
                  {l.name}
                </button>
              ))}
            </div>

            {/* Clear Chat Button */}
            <button
              aria-label="Clear chat"
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-rose-600 transition cursor-pointer"
              onClick={handleClearChat}
              title="Clear conversation"
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Mute Toggle */}
            <button
              aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text-main transition cursor-pointer"
              onClick={() => {
                if (!isMuted) stopAudio()
                setIsMuted(!isMuted)
              }}
              title={isMuted ? 'Unmute voice' : 'Mute voice'}
              type="button"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-rose-500" /> : <Volume2 className="h-4 w-4 text-primary" />}
            </button>

            {/* Close Button */}
            <button
              aria-label="Close assistant"
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text-main transition cursor-pointer"
              onClick={() => {
                stopAudio()
                onClose()
              }}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. Interactive Mascot Stage */}
        <div className="relative flex flex-col items-center justify-center border-b border-border/60 bg-gradient-to-b from-surface-muted/40 via-surface to-background/50 py-3 px-4">
          {/* Status Capsule */}
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-0.5 text-[10px] font-bold text-secondary shadow-2xs">
            {robotState === 'listening' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>🎙️ Listening to you... (ਸੁਣ ਰਿਹਾ ਹਾਂ)</span>
              </>
            ) : robotState === 'speaking' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>🔊 Mascot speaking (ਬੋਲ ਰਿਹਾ ਹਾਂ)</span>
              </>
            ) : robotState === 'processing' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-spin" />
                <span>⚡ Thinking & Finding answers...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-secondary animate-spin-slow" />
                <span>✨ Ready to Help • Tap mic to speak</span>
              </>
            )}
          </div>

          <div
            className="cursor-pointer transition-transform hover:scale-102"
            onClick={() => {
              if (robotState === 'idle') startListening()
              else stopAudio()
            }}
            title={robotState === 'idle' ? 'Click mascot to speak' : 'Click to stop'}
          >
            <RobotAvatar
              className="scale-75 -my-4"
              isMouthMoving={isMouthMoving}
              language={language}
              state={robotState}
            />
          </div>

          <VoiceWaveform
            barCount={16}
            isActive={robotState === 'speaking' || robotState === 'listening'}
            state={robotState}
          />
        </div>

        {/* 3. Conversation Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 sm:px-5 bg-background/30">
          {messages.map((msg) => (
            <div
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
              key={msg.id}
            >
              {/* Message Bubble */}
              <div
                className={`group relative max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs transition-all ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-primary to-primary-hover text-white rounded-br-xs'
                    : msg.isError
                    ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-xs'
                    : 'bg-surface text-text-main border border-border/80 rounded-bl-xs'
                }`}
              >
                {/* Assistant Identity tag */}
                {msg.sender === 'assistant' && (
                  <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-border/40 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1 font-bold text-primary">
                      <Bot className="h-3 w-3 text-primary" />
                      <span>SkillBridge AI</span>
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 hover:text-primary cursor-pointer"
                        onClick={() => speakResponse(msg.speechText || msg.text)}
                        title="Replay voice audio"
                        type="button"
                      >
                        <Volume2 className="h-3 w-3" />
                      </button>
                      <button
                        className="p-1 hover:text-primary cursor-pointer"
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        title="Copy message"
                        type="button"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <p className="whitespace-pre-line text-xs font-normal">{msg.text}</p>
              </div>

              {/* Rich Visual Action Cards (Products, Orders, Support Desk) */}
              {msg.actionData && (
                <div className="mt-2 w-full max-w-[95%] space-y-2.5">
                  {/* Products Card List */}
                  {msg.actionData.products && msg.actionData.products.length > 0 && (
                    <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-secondary">
                        <span className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" />
                          <span>Handmade Crafts ({msg.actionData.products.length})</span>
                        </span>
                        <span className="text-[10px] bg-secondary/10 px-2 py-0.5 rounded-full">
                          Authentic Artisan Crafts
                        </span>
                      </div>
                      <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                        {msg.actionData.products.map((p, idx) => (
                          <div
                            className="flex items-center justify-between gap-2.5 rounded-xl bg-white p-2.5 text-xs border border-border shadow-2xs hover:border-secondary transition"
                            key={p.id || p._id || idx}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-muted border border-border/60">
                                {p.image || p.images?.[0] ? (
                                  <img
                                    alt={p.title}
                                    className="h-full w-full object-cover"
                                    src={p.image || p.images?.[0]}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-text-muted">
                                    <ShoppingBag className="h-4 w-4 text-primary" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-text-main truncate" title={p.title}>
                                  {p.title}
                                </p>
                                <p className="text-[10px] text-text-muted truncate">
                                  {p.category || 'Handicrafts'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-primary text-xs">₹{p.price}</span>
                              {p.stock !== undefined && (
                                <span className="block text-[10px] text-text-muted">
                                  Stock: {p.stock}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orders Card List */}
                  {msg.actionData.orders && msg.actionData.orders.length > 0 && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-3 space-y-2">
                      <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5 text-amber-700" />
                        <span>Order Status Tracking ({msg.actionData.orders.length})</span>
                      </p>
                      <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                        {msg.actionData.orders.map((o, idx) => (
                          <div
                            className="flex items-center justify-between rounded-xl bg-white p-2.5 text-xs border border-amber-200 shadow-2xs"
                            key={o.id || o._id || idx}
                          >
                            <div>
                              <p className="font-mono font-bold text-text-main text-xs">
                                #{o.orderNumber || (o._id ? o._id.slice(-6) : 'ORDER')}
                              </p>
                              <p className="text-[10px] text-text-muted truncate max-w-[150px]">
                                {o.items?.[0]?.title || 'Handcrafted items'}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-primary">₹{o.subtotal || o.totalAmount || 0}</span>
                              <span
                                className={`block text-[10px] font-bold ${
                                  o.status === 'Completed' || o.status === 'Delivered'
                                    ? 'text-emerald-600'
                                    : o.status === 'Disputed'
                                    ? 'text-rose-600'
                                    : 'text-amber-600'
                                }`}
                              >
                                {o.status || 'In Progress'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Earnings Card */}
                  {msg.actionData.totalEarned !== undefined && (
                    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-emerald-800">
                          Total Verified Earnings
                        </span>
                        <p className="text-base font-bold text-emerald-700">
                          ₹{msg.actionData.totalEarned.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-amber-800">
                          Pending Payouts
                        </span>
                        <p className="text-base font-bold text-amber-700">
                          ₹{(msg.actionData.pendingPayout || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 1-Click Navigation / Action Button */}
                  {msg.actionData.navigation && (
                    <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 to-secondary/10 p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-main flex items-center gap-1.5 truncate">
                          <Sparkles className="h-3.5 w-3.5 text-secondary shrink-0" />
                          <span>{msg.actionData.navigation.label}</span>
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Click to open directly
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:shadow hover:scale-102 active:scale-95 transition cursor-pointer shrink-0"
                        onClick={() => handleNavigationAction(msg.actionData.navigation)}
                        type="button"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Pending Action Confirmation Banner */}
          {pendingAction && (
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 shadow-sm animate-fadeIn">
              <p className="text-xs font-bold text-primary flex items-center gap-1.5 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span>ਕਿਰਪਾ ਕਰਕੇ ਪੁਸ਼ਟੀ ਕਰੋ / Please Confirm:</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                  onClick={() => handleSendMessage('yes')}
                  type="button"
                >
                  <Check className="h-4 w-4" />
                  <span>ਹਾਂ, ਪੁਸ਼ਟੀ ਕਰੋ (Yes)</span>
                </button>
                <button
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-text-secondary hover:bg-surface-muted transition cursor-pointer"
                  onClick={() => handleSendMessage('no')}
                  type="button"
                >
                  <X className="h-4 w-4" />
                  <span>ਰੱਦ ਕਰੋ (Cancel)</span>
                </button>
              </div>
            </div>
          )}

          {/* Real-time Voice Transcription bubble */}
          {liveTranscript && (
            <div className="rounded-2xl border border-secondary/40 bg-secondary/10 p-3 text-center text-xs font-semibold text-text-main animate-pulse">
              <span className="text-[10px] text-secondary block font-bold uppercase tracking-wider mb-0.5">
                {language === 'pa' ? 'ਸੁਣ ਰਿਹਾ ਹਾਂ...' : 'Hearing voice input:'}
              </span>
              &quot;{liveTranscript}&quot;
            </div>
          )}

          {/* Mic error warning */}
          {micError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-2.5 text-center text-xs text-red-700">
              {micError}
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* 4. Footer Interactive Voice & Text Controls */}
        <div className="border-t border-border/80 bg-surface p-3 sm:p-4 space-y-2.5">
          {/* Quick Voice Suggestion Chips */}
          <div className="flex flex-wrap gap-1.5 justify-center pb-0.5 max-h-20 overflow-y-auto">
            {suggestionChips.map((chip) => (
              <button
                className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface-muted/90 px-2.5 py-1 text-[11px] font-semibold text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition cursor-pointer shadow-2xs"
                key={chip.label}
                onClick={() => handleSendMessage(chip.command)}
                type="button"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Big Interactive Mic Button Controls */}
          <div className="flex items-center justify-center gap-4 pt-1">
            {/* Replay last audio button */}
            <button
              aria-label="Replay last speech"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-muted text-text-secondary hover:text-primary hover:border-primary transition cursor-pointer"
              onClick={() => {
                if (lastSpokenText) speakResponse(lastSpokenText)
              }}
              title="Replay assistant voice"
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Glowing Big Microphone Button */}
            <div className="relative flex items-center justify-center">
              {robotState === 'listening' && (
                <span className="absolute h-18 w-18 rounded-full bg-emerald-500/25 animate-ping" />
              )}
              <button
                aria-label={robotState === 'listening' ? 'Listening...' : 'Tap to speak'}
                className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  robotState === 'listening'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-300 animate-pulse'
                    : robotState === 'speaking'
                    ? 'bg-primary text-white ring-4 ring-primary/30'
                    : 'bg-gradient-to-tr from-primary to-secondary text-white hover:brightness-105 ring-4 ring-secondary/20 hover:scale-105'
                }`}
                onClick={() => {
                  if (robotState === 'listening') {
                    stopAudio()
                  } else {
                    startListening()
                  }
                }}
                type="button"
              >
                {robotState === 'listening' ? (
                  <Mic className="h-7 w-7 animate-bounce" />
                ) : robotState === 'speaking' ? (
                  <Volume2 className="h-7 w-7 animate-pulse" />
                ) : (
                  <Mic className="h-7 w-7" />
                )}
              </button>
            </div>

            {/* Stop audio button */}
            <button
              aria-label="Stop audio"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-muted text-text-secondary hover:text-rose-600 hover:border-rose-300 transition cursor-pointer"
              onClick={stopAudio}
              title="Stop listening or speaking"
              type="button"
            >
              <VolumeX className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-[10px] font-semibold text-text-muted">
            {robotState === 'listening'
              ? language === 'pa'
                ? 'ਬੋਲੋ ਜੀ... ਮੈਂ ਸੁਣ ਰਿਹਾ ਹਾਂ'
                : 'Listening... speak your request now'
              : language === 'pa'
              ? 'ਬੋਲਣ ਲਈ ਮਾਈਕ ਦਬਾਓ ਜਾਂ ਹੇਠਾਂ ਲਿਖੋ'
              : 'Tap mic to speak or type in any language below'}
          </p>

          {/* Text Input Fallback Bar */}
          <form
            className="flex items-center gap-2 pt-0.5"
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage(inputMessage)
            }}
          >
            <input
              className="flex-1 rounded-xl border border-border bg-surface-muted/60 px-3.5 py-2 text-xs text-text-main outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary transition placeholder:text-text-muted"
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                language === 'pa'
                  ? "ਕੁਝ ਵੀ ਪੁੱਛੋ (ਜਿਵੇਂ 'ਉਤਪਾਦ ਦਿਖਾਓ', 'ਆਰਡਰ ਟ੍ਰੈਕ ਕਰੋ')..."
                  : language === 'hi'
                  ? "कुछ भी पूछें (जैसे 'उत्पाद दिखाओ', 'ऑर्डर ट्रैक करो')..."
                  : "Ask anything (e.g., 'Track order', 'Show products')..."
              }
              value={inputMessage}
            />
            <button
              aria-label="Send message"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-hover transition disabled:opacity-40 cursor-pointer"
              disabled={!inputMessage.trim()}
              type="submit"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ArtisanVoiceAssistantDrawer
