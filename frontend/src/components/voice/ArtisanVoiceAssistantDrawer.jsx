import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Mic,
  Package,
  PackagePlus,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  UploadCloud,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import RobotAvatar from './RobotAvatar'
import VoiceWaveform from './VoiceWaveform'
import {
  sendVoiceAssistantMessageApi,
  synthesizeVoiceAudioApi,
  transcribeVoiceAudioApi,
} from '../../services/voice-api'
import {
  getArtisanShopApi,
  saveArtisanShopApi,
  createArtisanListingApi,
  publishArtisanListingApi,
} from '../../services/artisan-api'
import {
  SHOP_QUESTIONS,
  PRODUCT_QUESTIONS,
  MASCOT_UI,
  formatProgress,
  validatePriceInput,
  validateStockInput,
} from '../../utils/mascot-translations'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthDialog } from '../../hooks/useAuthDialog'

const LANGUAGE_LOCALES = {
  pa: 'pa-IN',
  hi: 'hi-IN',
  en: 'en-IN',
}

const LANGUAGES = [
  { code: 'pa', name: 'ਪੰਜਾਬੀ', label: 'Punjabi', script: 'Gurmukhi', flag: '🇮🇳' },
  { code: 'hi', name: 'हिंदी', label: 'Hindi', script: 'Devanagari', flag: '🇮🇳' },
  { code: 'en', name: 'English', label: 'English', script: 'Latin', flag: '🇬🇧' },
]

function detectClientLanguage(text = '', fallback = 'pa') {
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'
  if (/[\u0900-\u097F]/.test(text)) return 'hi'

  const lower = text.toLowerCase()
  const punjabiMarkers = [
    'kamm', 'kardi', 'karda', 'tajrba', 'mera na', 'pind', 'patiala',
    'amritsar', 'sat sri akal', 'phulkari', 'silai', 'jodo', 'tuhada',
    'tussi', 'dasso',
  ]
  const hindiMarkers = [
    'karti hoon', 'karta hoon', 'anubhav', 'saal', 'gaon', 'shahar',
    'namaste', 'batao', 'meri kamai', 'kitna', 'kaise', 'mujhe',
  ]
  const englishMarkers = [
    'i am', 'i live', 'years of', 'experience', 'tailor', 'tailoring',
    'stitching', 'embroidery', 'show me', 'track my', 'create my', 'add a',
    'add new', 'add product', 'new product', 'create shop', 'open shop',
    'track order', 'what is', 'where is', 'help me', 'my name is', 'my order',
    'my shop', 'missing in', 'how many', 'profile', 'products',
  ]

  if (punjabiMarkers.some((marker) => lower.includes(marker))) return 'pa'
  if (hindiMarkers.some((marker) => lower.includes(marker))) return 'hi'
  if (englishMarkers.some((marker) => lower.includes(marker))) return 'en'
  return fallback
}

function getWelcomeContent(lang, activeUser, path = '') {
  const isArtisan = activeUser?.accountType === 'artisan'
  const isCustomer = activeUser?.accountType === 'customer'
  const isIndustry = activeUser?.accountType === 'industry'
  const name = activeUser?.name ? ` ${activeUser.name} ji` : ''

  if (isArtisan) {
    if (lang === 'pa') {
      return {
        text: `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ${name}! ਮੈਂ ਤੁਹਾਡਾ ਸਕਿੱਲਬ੍ਰਿਜ AI ਮੈਸਕੌਟ ਹਾਂ। ਤੁਸੀਂ ਆਸਾਨੀ ਨਾਲ ਆਪਣੀ ਦੁਕਾਨ ਬਣਾ ਸਕਦੇ ਹੋ, ਨਵਾਂ ਉਤਪਾਦ ਜੋੜ ਸਕਦੇ ਹੋ, ਜਾਂ ਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ। ਹੇਠਾਂ ਦਿੱਤੇ ਵਿਕਲਪਾਂ ਵਿੱਚੋਂ ਚੁਣੋ:`,
        speechText: `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ${name}! ਮੈਂ ਤੁਹਾਡਾ ਸਕਿੱਲਬ੍ਰਿਜ AI ਮੈਸਕੌਟ ਹਾਂ। ਦੱਸੋ ਅੱਜ ਮੈਂ ਕੀ ਮਦਦ ਕਰਾਂ?`,
      }
    }
    if (lang === 'hi') {
      return {
        text: `नमस्ते${name}! मैं आपका स्किलब्रिज AI मैस्कॉट हूँ। आप आसानी से अपनी दुकान बना सकते हैं, नया उत्पाद जोड़ सकते हैं, या कोई भी सवाल पूछ सकते हैं। नीचे दिए गए विकल्पों में से चुनें:`,
        speechText: `नमस्ते${name}! मैं आपका स्किलब्रिज AI मैस्कॉट हूँ। बताइए आज मैं आपकी क्या मदद करूँ?`,
      }
    }
    return {
      text: `Hello${name}! I am your SkillBridge AI Mascot. You can easily set up your shop, list handmade products, or ask me anything. Choose from the options below:`,
      speechText: `Hello${name}! I am your SkillBridge AI assistant. How can I help you today?`,
    }
  }

  if (isCustomer) {
    if (lang === 'pa') {
      return {
        text: `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ${name}! ਮੈਂ ਸਕਿੱਲਬ੍ਰਿਜ ਦਾ AI ਮੈਸਕੌਟ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਉਤਪਾਦ ਖੋਜਣ, ਆਰਡਰ ਟ੍ਰੈਕ ਕਰਨ ਜਾਂ ਗਾਹਕ ਸਹਾਇਤਾ ਲਈ ਕਹਿ ਸਕਦੇ ਹੋ।`,
        speechText: `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ${name}! ਮੈਂ ਤੁਹਾਡੀ ਹਰ ਕੰਮ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ।`,
      }
    }
    if (lang === 'hi') {
      return {
        text: `नमस्ते${name}! मैं स्किलब्रिज का AI मैस्कॉट हूँ। आप मुझसे हस्तशिल्प खोजने, ऑर्डर ट्रैक करने या सहायता केंद्र के लिए बोल सकते हैं।`,
        speechText: `नमस्ते${name}! मैं हस्तशिल्प खोजने और ऑर्डर में आपकी पूरी मदद करूँगा।`,
      }
    }
    return {
      text: `Hello${name}! I am your SkillBridge AI Mascot. You can ask me to discover authentic crafts, track deliveries, or get customer support!`,
      speechText: `Hello${name}! I am your craft assistant. How can I help you today?`,
    }
  }

  if (path.includes('/artisan/auth')) {
    if (lang === 'pa') {
      return {
        text: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਤੁਹਾਡਾ ਸਕਿੱਲਬ੍ਰਿਜ AI ਮੈਸਕੌਟ ਹਾਂ। ਤੁਸੀਂ ਦਸਤਕਾਰ ਵਜੋਂ ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰ ਸਕਦੇ ਹੋ ਜਾਂ ਲੌਗਇਨ ਮਦਦ ਲੈ ਸਕਦੇ ਹੋ।',
        speechText: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਕੀ ਤੁਸੀਂ ਦਸਤਕਾਰ ਵਜੋਂ ਰਜਿਸਟਰ ਕਰਨਾ ਜਾਂ ਲੌਗਇਨ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?',
      }
    }
    if (lang === 'hi') {
      return {
        text: 'नमस्ते जी! मैं आपका स्किलब्रिज सहायक हूँ। आप बोलकर कारीगर रजिस्ट्रेशन कर सकते हैं या लॉगिन सहायता ले सकते हैं।',
        speechText: 'नमस्ते जी! क्या आप बोलकर रजिस्ट्रेशन या लॉगिन करना चाहते हैं?',
      }
    }
    return {
      text: 'Hello! Welcome to Artisan Onboarding. You can register hands-free simply by speaking, or get login help.',
      speechText: 'Hello! Need help logging in or registering by voice? Talk to me directly.',
    }
  }

  if (isIndustry || path.includes('/industry/auth')) {
    if (lang === 'pa') {
      return {
        text: 'ਜੀ ਆਇਆਂ ਨੂੰ! ਉਦਯੋਗਿਕ ਭਾਈਵਾਲੀ, ਬਲਕ ਦਸਤਕਾਰੀ ਆਰਡਰਾਂ ਜਾਂ ਕੰਟਰੈਕਟਾਂ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ।',
        speechText: 'ਜੀ ਆਇਆਂ ਨੂੰ! ਉਦਯੋਗਿਕ ਪ੍ਰੋਜੈਕਟਾਂ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ।',
      }
    }
    if (lang === 'hi') {
      return {
        text: 'स्वागत है! औद्योगिक साझेदारी, थोक कारीगर अनुबंधों या प्रोजेक्ट्स के बारे में कुछ भी पूछें।',
        speechText: 'स्वागत है! औद्योगिक प्रोजेक्ट्स में आपकी क्या मदद करूँ?',
      }
    }
    return {
      text: 'Welcome Industry Partners! Ask me about B2B artisan contracts, bulk orders, or logging in.',
      speechText: 'Welcome! How can I assist you with industrial partnerships today?',
    }
  }

  // Default guest welcome
  if (lang === 'pa') {
    return {
      text: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਸਕਿੱਲਬ੍ਰਿਜ ਦਾ 24/7 AI ਮੈਸਕੌਟ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਉਤਪਾਦ ਖੋਜਣ, ਆਰਡਰ ਟ੍ਰੈਕ ਕਰਨ, ਬੋਲ ਕੇ ਰਜਿਸਟਰ ਕਰਨ, ਜਾਂ ਦੁਕਾਨ ਸੰਭਾਲਣ ਲਈ ਕਹਿ ਸਕਦੇ ਹੋ।',
      speechText: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਸਕਿੱਲਬ੍ਰਿਜ ਸਹਾਇਕ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਹਰ ਕੰਮ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗਾ।',
    }
  }
  if (lang === 'hi') {
    return {
      text: 'नमस्ते जी! मैं स्किलब्रिज का 24/7 AI मैस्कॉट हूँ। आप मुझसे हस्तशिल्प खोजने, ऑर्डर ट्रैक करने, बोलकर कारीगर रजिस्ट्रेशन, या दुकान संभालने के बारे में पूछ सकते हैं।',
      speechText: 'नमस्ते जी! मैं आपका स्किलब्रिज सहायक हूँ। बताइए आज क्या सेवा करूँ?',
    }
  }
  return {
    text: 'Hello! I am your SkillBridge AI Mascot & Assistant. Ask me how to discover authentic crafts, track deliveries, register hands-free as an artisan, or manage your shop!',
    speechText: 'Hello! I am your SkillBridge assistant. How can I help you today?',
  }
}

const ArtisanVoiceAssistantDrawer = ({ isOpen, onClose, user: propUser, initialQuery = '' }) => {
  const [language, setLanguage] = useState('pa')
  const navigate = useNavigate()
  const location = useLocation()
  const { openAuth, currentUser, authenticate } = useAuthDialog()

  const activeUser = propUser || currentUser
  const pathname = location?.pathname || ''

  // Mode: 'AMA' (freeform Q&A) | 'GUIDED_SHOP' | 'GUIDED_PRODUCT'
  const [mode, setMode] = useState('AMA')

  // Guided Flow State
  const [guidedStep, setGuidedStep] = useState(0)
  const [guidedAnswers, setGuidedAnswers] = useState({})
  const [guidedImageFile, setGuidedImageFile] = useState(null)
  const [guidedImagePreview, setGuidedImagePreview] = useState(null)
  const [guidedError, setGuidedError] = useState('')
  const [isShowingPreview, setIsShowingPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [artisanShop, setArtisanShop] = useState(null)
  const [isLoadingShop, setIsLoadingShop] = useState(false)

  // Audio & Animation states
  const [robotState, setRobotState] = useState('idle') // 'idle' | 'speaking' | 'listening' | 'processing'
  const [isMouthMoving, setIsMouthMoving] = useState(false)
  const [lastSpokenText, setLastSpokenText] = useState('')
  const [micError, setMicError] = useState('')
  const [speechError, setSpeechError] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [inputMessage, setInputMessage] = useState('')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [pendingAction, setPendingAction] = useState(null)

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

  const chatBottomRef = useRef(null)
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const recorderAudioContextRef = useRef(null)
  const recorderMonitorTimerRef = useRef(null)
  const recorderMaxTimerRef = useRef(null)
  const recordingChunksRef = useRef([])
  const recordingRequestRef = useRef(0)
  const isListeningRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const fileInputRef = useRef(null)
  const audioRef = useRef(null)
  const audioUrlRef = useRef(null)
  const speechRequestRef = useRef(0)

  // Fetch active artisan shop on open or when activeUser changes
  useEffect(() => {
    if (isOpen && activeUser?.accountType === 'artisan') {
      setIsLoadingShop(true)
      getArtisanShopApi()
        .then((res) => {
          if (res?.shop) setArtisanShop(res.shop)
          else setArtisanShop(null)
        })
        .catch(() => setArtisanShop(null))
        .finally(() => setIsLoadingShop(false))
    }
  }, [isOpen, activeUser])

  useEffect(() => {
    if (!isOpen) return
    setMessages((prev) => {
      if (prev.length > 1) return prev
      const welcome = getWelcomeContent(language, activeUser, pathname)
      return [
        {
          id: 'welcome',
          sender: 'assistant',
          text: welcome.text,
          speechText: welcome.speechText,
          actionData: null,
          timestamp: new Date(),
        },
      ]
    })
  }, [isOpen, language, activeUser, pathname])

  const releaseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (audioUrlRef.current && typeof URL !== 'undefined') {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
  }, [])

  // Stop all audio & speech recognition
  const stopAudio = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    speechRequestRef.current += 1
    releaseAudio()
    isSpeakingRef.current = false
    setIsMouthMoving(false)
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (_) {}
      isListeningRef.current = false
    }
    recordingRequestRef.current += 1
    window.clearTimeout(recorderMonitorTimerRef.current)
    window.clearTimeout(recorderMaxTimerRef.current)
    recorderMonitorTimerRef.current = null
    recorderMaxTimerRef.current = null
    if (recorderAudioContextRef.current?.state !== 'closed') {
      recorderAudioContextRef.current?.close()
    }
    recorderAudioContextRef.current = null
    if (mediaRecorderRef.current) {
      isListeningRef.current = false
      mediaRecorderRef.current.onstop = null
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
    recordingChunksRef.current = []
    if (robotState === 'speaking' || robotState === 'listening') {
      setRobotState('idle')
    }
  }, [releaseAudio, robotState])

  // Prefer server TTS for Hindi and Punjabi, with a browser voice fallback.
  const speakResponse = useCallback(
    async (text, targetLang = language, onComplete) => {
      if (isMuted || !text || typeof window === 'undefined') {
        if (onComplete) onComplete()
        return
      }

      stopAudio()
      const requestId = speechRequestRef.current
      setSpeechError('')
      setRobotState('speaking')
      setIsMouthMoving(true)
      isSpeakingRef.current = true
      setLastSpokenText(text)

      // Clean speech text thoroughly
      const cleanSpoken = text
        .replace(/[*_#`~[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/₹\s*/g, 'Rupees ')
        .replace(/\s+/g, ' ')
        .trim()

      let completed = false
      let fallbackStarted = false
      const finish = () => {
        if (completed || speechRequestRef.current !== requestId) return
        completed = true
        releaseAudio()
        isSpeakingRef.current = false
        setIsMouthMoving(false)
        setRobotState('idle')
        if (onComplete) onComplete()
      }

      const speakWithBrowser = () => {
        if (speechRequestRef.current !== requestId || fallbackStarted) return
        fallbackStarted = true
        if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
          setSpeechError(
            targetLang === 'pa'
              ? 'ਪੰਜਾਬੀ ਆਵਾਜ਼ ਸੇਵਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।'
              : targetLang === 'hi'
              ? 'हिंदी आवाज़ सेवा उपलब्ध नहीं है।'
              : 'Speech playback is unavailable.'
          )
          finish()
          return
        }

        const locale = LANGUAGE_LOCALES[targetLang] || LANGUAGE_LOCALES.en
        const prefix = targetLang === 'pa' ? 'pa' : targetLang === 'hi' ? 'hi' : 'en'
        const voice = window.speechSynthesis
          .getVoices()
          .find((item) => item.lang?.toLowerCase().startsWith(prefix))
        if (targetLang !== 'en' && !voice) {
          setSpeechError(
            targetLang === 'pa'
              ? 'ਪੰਜਾਬੀ ਆਵਾਜ਼ ਉਪਲਬਧ ਨਹੀਂ; ਡਿਵਾਈਸ ਦੀ ਆਵਾਜ਼ ਵਰਤੀ ਜਾ ਰਹੀ ਹੈ।'
              : 'हिंदी आवाज़ उपलब्ध नहीं; डिवाइस की आवाज़ इस्तेमाल की जा रही है।'
          )
        }

        const utterance = new SpeechSynthesisUtterance(cleanSpoken)
        utterance.lang = locale
        utterance.rate = 0.95
        utterance.pitch = 1.05
        if (voice) utterance.voice = voice
        utterance.onstart = () => {
          setIsMouthMoving(true)
          setRobotState('speaking')
        }
        utterance.onboundary = () => setIsMouthMoving((prev) => !prev)
        utterance.onend = finish
        utterance.onerror = () => {
          setSpeechError('Speech playback failed on this device.')
          finish()
        }
        window.speechSynthesis.speak(utterance)
      }

      if (targetLang === 'pa' || targetLang === 'hi') {
        try {
          const blob = await synthesizeVoiceAudioApi(cleanSpoken, targetLang)
          if (speechRequestRef.current !== requestId) return
          if (!blob.size) throw new Error('TTS returned empty audio')
          const audioUrl = URL.createObjectURL(blob)
          const audio = new Audio(audioUrl)
          audioUrlRef.current = audioUrl
          audioRef.current = audio
          audio.onended = finish
          audio.onerror = () => {
            if (speechRequestRef.current !== requestId) return
            setSpeechError(
              targetLang === 'pa'
                ? 'ਪੰਜਾਬੀ TTS ਉਪਲਬਧ ਨਹੀਂ; ਡਿਵਾਈਸ ਦੀ ਆਵਾਜ਼ ਵਰਤੀ ਜਾ ਰਹੀ ਹੈ।'
                : 'हिंदी TTS उपलब्ध नहीं; डिवाइस की आवाज़ इस्तेमाल की जा रही है।'
            )
            releaseAudio()
            speakWithBrowser()
          }
          await audio.play()
          return
        } catch (error) {
          if (speechRequestRef.current !== requestId) return
          releaseAudio()
          console.warn('Regional TTS unavailable; using device speech.', error)
          setSpeechError(
            targetLang === 'pa'
              ? 'ਪੰਜਾਬੀ TTS ਉਪਲਬਧ ਨਹੀਂ; ਡਿਵਾਈਸ ਦੀ ਆਵਾਜ਼ ਵਰਤੀ ਜਾ ਰਹੀ ਹੈ।'
              : 'हिंदी TTS उपलब्ध नहीं; डिवाइस की आवाज़ इस्तेमाल की जा रही है।'
          )
          speakWithBrowser()
          return
        }
      }

      speakWithBrowser()
    },
    [isMuted, language, releaseAudio, stopAudio]
  )

  useEffect(
    () => () => {
      speechRequestRef.current += 1
      recordingRequestRef.current += 1
      releaseAudio()
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      }
      window.clearTimeout(recorderMonitorTimerRef.current)
      window.clearTimeout(recorderMaxTimerRef.current)
      if (recorderAudioContextRef.current?.state !== 'closed') {
        recorderAudioContextRef.current?.close()
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    },
    [releaseAudio]
  )

  useEffect(() => {
    if (!isOpen) stopAudio()
  }, [isOpen, stopAudio])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveTranscript, pendingAction, isShowingPreview, mode, guidedStep])

  // Current active questions list based on mode
  const currentQuestions = useMemo(() => {
    if (mode === 'GUIDED_SHOP') return SHOP_QUESTIONS
    if (mode === 'GUIDED_PRODUCT') return PRODUCT_QUESTIONS
    return []
  }, [mode])

  const activeQuestion = useMemo(() => {
    if (!currentQuestions || currentQuestions.length === 0) return null
    return currentQuestions[guidedStep] || null
  }, [currentQuestions, guidedStep])

  // When language changes: immediately refresh current view, welcome, or re-speak current question
  const handleLanguageChange = (newLang) => {
    stopAudio()
    setLanguage(newLang)

    if (mode === 'AMA') {
      const fresh = getWelcomeContent(newLang, activeUser, pathname)
      setMessages((prev) => {
        if (prev.length <= 1) {
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
    } else if (activeQuestion) {
      const prompt = activeQuestion.prompts[newLang]
      if (prompt?.spoken) {
        speakResponse(prompt.spoken, newLang)
      }
    }
  }

  // Launch Guided Shop Creation
  const handleStartShopCreation = (targetLanguage = language) => {
    stopAudio()
    setMode('GUIDED_SHOP')
    setGuidedStep(0)
    setGuidedAnswers({})
    setGuidedImageFile(null)
    setGuidedImagePreview(null)
    setGuidedError('')
    setIsShowingPreview(false)

    const q1 = SHOP_QUESTIONS[0]
    const spoken = q1.prompts[targetLanguage].spoken
    const display = q1.prompts[targetLanguage].display

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-mode-shop-${Date.now()}`,
        sender: 'assistant',
        text: `🏪 ${MASCOT_UI.options.createShop[targetLanguage]}\n\n${formatProgress(1, SHOP_QUESTIONS.length, targetLanguage)}\n${display}`,
        speechText: spoken,
        timestamp: new Date(),
      },
    ])
    speakResponse(spoken, targetLanguage)
  }

  // Launch Guided Product Creation
  const handleStartProductCreation = (targetLanguage = language) => {
    stopAudio()

    if (!activeUser) {
      const reqLogin = MASCOT_UI.feedback.loginRequired[targetLanguage]
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-login-req-${Date.now()}`,
          sender: 'assistant',
          text: reqLogin,
          speechText: reqLogin,
          timestamp: new Date(),
        },
      ])
      speakResponse(reqLogin, targetLanguage)
      return
    }

    // Check if artisan already has a shop
    if (!artisanShop) {
      const noShopNotice = MASCOT_UI.feedback.requireShopFirst[targetLanguage]
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-no-shop-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ ${noShopNotice}`,
          speechText: noShopNotice,
          actionData: {
            requireShop: true,
          },
          timestamp: new Date(),
        },
      ])
      speakResponse(noShopNotice, targetLanguage)
      return
    }

    setMode('GUIDED_PRODUCT')
    setGuidedStep(0)
    setGuidedAnswers({})
    setGuidedImageFile(null)
    setGuidedImagePreview(null)
    setGuidedError('')
    setIsShowingPreview(false)

    const q1 = PRODUCT_QUESTIONS[0]
    const spoken = q1.prompts[targetLanguage].spoken
    const display = q1.prompts[targetLanguage].display

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-mode-product-${Date.now()}`,
        sender: 'assistant',
        text: `📦 ${MASCOT_UI.options.addProduct[targetLanguage]}\n\n${formatProgress(1, PRODUCT_QUESTIONS.length, targetLanguage)}\n${display}`,
        speechText: spoken,
        timestamp: new Date(),
      },
    ])
    speakResponse(spoken, targetLanguage)
  }

  // Switch to AMA freeform mode
  const handleSwitchToAMA = () => {
    stopAudio()
    setMode('AMA')
    setGuidedError('')
    setIsShowingPreview(false)

    const msg =
      language === 'pa'
        ? '💬 ਤੁਸੀਂ ਕੁਝ ਵੀ ਪੁੱਛ ਸਕਦੇ ਹੋ! ਆਪਣੀ ਦੁਕਾਨ, ਕੀਮਤਾਂ, ਜਾਂ ਆਰਡਰਾਂ ਬਾਰੇ ਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛੋ।'
        : language === 'hi'
        ? '💬 आप कुछ भी पूछ सकते हैं! अपनी दुकान, कीमतों, या ऑर्डर के बारे में कोई भी प्रश्न पूछिए।'
        : "💬 Ask Me Anything! You can ask questions about your shop, product pricing, or platform orders."

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-ama-${Date.now()}`,
        sender: 'assistant',
        text: msg,
        speechText: msg,
        timestamp: new Date(),
      },
    ])
    speakResponse(msg)
  }

  // Cancel Guided Workflow
  const handleCancelWorkflow = () => {
    stopAudio()
    setMode('AMA')
    setGuidedStep(0)
    setGuidedAnswers({})
    setGuidedImageFile(null)
    setGuidedImagePreview(null)
    setGuidedError('')
    setIsShowingPreview(false)

    const cancelMsg = MASCOT_UI.feedback.workflowCancelled[language]
    setMessages((prev) => [
      ...prev,
      {
        id: `cancel-${Date.now()}`,
        sender: 'assistant',
        text: cancelMsg,
        speechText: cancelMsg,
        timestamp: new Date(),
      },
    ])
    speakResponse(cancelMsg)
  }

  // Go Back to previous guided question
  const handleGoBack = () => {
    if (guidedStep > 0) {
      stopAudio()
      setGuidedError('')
      setIsShowingPreview(false)
      const prevStep = guidedStep - 1
      setGuidedStep(prevStep)

      const prevQ = currentQuestions[prevStep]
      const spoken = prevQ.prompts[language].spoken
      const display = prevQ.prompts[language].display

      setMessages((prev) => [
        ...prev,
        {
          id: `step-back-${Date.now()}`,
          sender: 'assistant',
          text: `${formatProgress(prevStep + 1, currentQuestions.length, language)}\n${display}`,
          speechText: spoken,
          timestamp: new Date(),
        },
      ])
      speakResponse(spoken)
    }
  }

  // Skip current question (allowed if optional or image)
  const handleSkipQuestion = () => {
    if (!activeQuestion) return
    const key = activeQuestion.key

    const updated = {
      ...guidedAnswers,
      [key]: '',
    }
    setGuidedAnswers(updated)
    setGuidedError('')
    proceedToNextQuestion(guidedStep + 1, updated)
  }

  // Handle Image File Selection
  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setGuidedImageFile(file)
    const previewUrl = URL.createObjectURL(file)
    setGuidedImagePreview(previewUrl)
    setGuidedError('')

    const updated = {
      ...guidedAnswers,
      [activeQuestion.key]: file.name || 'image.jpg',
    }
    setGuidedAnswers(updated)

    // User message showing image thumbnail
    setMessages((prev) => [
      ...prev,
      {
        id: `user-img-${Date.now()}`,
        sender: 'user',
        text: `📷 [${MASCOT_UI.actions.uploadImage[language]}: ${file.name}]`,
        imagePreview: previewUrl,
        timestamp: new Date(),
      },
    ])

    proceedToNextQuestion(guidedStep + 1, updated)
  }

  // Move forward in guided flow
  const proceedToNextQuestion = (nextIndex, currentAns) => {
    if (nextIndex >= currentQuestions.length) {
      // Completed all questions -> Display Preview!
      setIsShowingPreview(true)
      const isShop = mode === 'GUIDED_SHOP'
      const previewMsg = isShop
        ? language === 'pa'
          ? 'ਬਹੁਤ ਵਧੀਆ! ਮੇਰੇ ਕੋਲ ਤੁਹਾਡੀ ਦੁਕਾਨ ਦੇ ਸਾਰੇ ਵੇਰਵੇ ਆ ਗਏ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਝਲਕ (ਪ੍ਰੀਵਿਊ) ਦੇਖੋ ਅਤੇ ਪੁਸ਼ਟੀ ਕਰੋ:'
          : language === 'hi'
          ? 'बहुत बढ़िया! मेरे पास आपकी दुकान के सभी विवरण आ चुके हैं। कृपया नीचे पूर्वावलोकन देखें और पुष्टि करें:'
          : 'Great! I have collected all your shop details. Please review the preview below and confirm to create your shop:'
        : language === 'pa'
        ? 'ਸ਼ਾਨਦਾਰ! ਤੁਹਾਡੇ ਉਤਪਾਦ ਦੇ ਸਾਰੇ ਵੇਰਵੇ ਦਰਜ ਹੋ ਗਏ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਪ੍ਰੀਵਿਊ ਚੈੱਕ ਕਰੋ ਅਤੇ ਪਬਲਿਸ਼ ਕਰਨ ਲਈ ਪੁਸ਼ਟੀ ਕਰੋ:'
        : language === 'hi'
        ? 'शानदार! आपके उत्पाद के सभी विवरण दर्ज हो गए हैं। कृपया नीचे पूर्वावलोकन देखें और प्रकाशित करने के लिए पुष्टि करें:'
        : 'Excellent! All product details are ready. Please review the preview card below and confirm to publish:'

      setMessages((prev) => [
        ...prev,
        {
          id: `preview-prompt-${Date.now()}`,
          sender: 'assistant',
          text: previewMsg,
          speechText: previewMsg,
          timestamp: new Date(),
        },
      ])
      speakResponse(previewMsg)
      return
    }

    setGuidedStep(nextIndex)
    const nextQ = currentQuestions[nextIndex]
    const spoken = nextQ.prompts[language].spoken
    const display = nextQ.prompts[language].display

    setMessages((prev) => [
      ...prev,
      {
        id: `step-${nextIndex}-${Date.now()}`,
        sender: 'assistant',
        text: `${formatProgress(nextIndex + 1, currentQuestions.length, language)}\n${display}`,
        speechText: spoken,
        timestamp: new Date(),
      },
    ])
    speakResponse(spoken)
  }

  // Answer current guided question
  const handleAnswerGuidedQuestion = (rawAnswer) => {
    if (!activeQuestion) return
    const text = (rawAnswer || inputMessage).trim()
    if (!text && activeQuestion.required) return

    setGuidedError('')

    // Validation for numbers
    if (activeQuestion.type === 'number') {
      if (activeQuestion.key === 'price') {
        const validated = validatePriceInput(text)
        if (validated === null) {
          const err = activeQuestion.prompts[language].error
          setGuidedError(err)
          speakResponse(err)
          return
        }
        recordAndAdvance(activeQuestion.key, validated, text)
        return
      }

      if (activeQuestion.key === 'stock') {
        const validated = validateStockInput(text)
        if (validated === null) {
          const err = activeQuestion.prompts[language].error
          setGuidedError(err)
          speakResponse(err)
          return
        }
        recordAndAdvance(activeQuestion.key, validated, text)
        return
      }
    }

    recordAndAdvance(activeQuestion.key, text, text)
  }

  const recordAndAdvance = (key, value, displayText) => {
    setInputMessage('')
    setLiveTranscript('')

    // User message bubble
    setMessages((prev) => [
      ...prev,
      {
        id: `user-ans-${Date.now()}`,
        sender: 'user',
        text: String(displayText),
        timestamp: new Date(),
      },
    ])

    const updated = {
      ...guidedAnswers,
      [key]: value,
    }
    setGuidedAnswers(updated)
    proceedToNextQuestion(guidedStep + 1, updated)
  }

  // Jump back to edit a specific field from preview
  const handleEditField = (index) => {
    stopAudio()
    setIsShowingPreview(false)
    setGuidedStep(index)
    setGuidedError('')

    const q = currentQuestions[index]
    const spoken = q.prompts[language].spoken
    const display = q.prompts[language].display

    setMessages((prev) => [
      ...prev,
      {
        id: `edit-field-${Date.now()}`,
        sender: 'assistant',
        text: `✏️ ${MASCOT_UI.actions.edit[language]}: ${formatProgress(index + 1, currentQuestions.length, language)}\n${display}`,
        speechText: spoken,
        timestamp: new Date(),
      },
    ])
    speakResponse(spoken)
  }

  // Final Confirmation & Submission for Shop
  const handleConfirmCreateShop = async () => {
    setIsSaving(true)
    stopAudio()

    try {
      const name = (guidedAnswers.name || '').trim()
      const category = (guidedAnswers.category || 'Handicrafts').trim()
      const description = `${guidedAnswers.description || ''}${
        guidedAnswers.speciality ? ` Speciality: ${guidedAnswers.speciality}` : ''
      }`.trim()
      const location = (guidedAnswers.location || '').trim()

      let shopRes
      if (guidedImageFile) {
        const formData = new FormData()
        formData.append('name', name)
        formData.append('category', category)
        formData.append('description', description || 'Authentic artisan shop')
        formData.append('location', location)
        formData.append('logo', guidedImageFile)
        formData.append('banner', guidedImageFile)
        shopRes = await saveArtisanShopApi(formData)
      } else {
        shopRes = await saveArtisanShopApi({
          name,
          category,
          description: description || 'Authentic artisan shop',
          location,
        })
      }

      if (shopRes?.shop) {
        setArtisanShop(shopRes.shop)
      }

      const successMsg = MASCOT_UI.feedback.shopCreatedSuccess[language]
      setMessages((prev) => [
        ...prev,
        {
          id: `success-shop-${Date.now()}`,
          sender: 'assistant',
          text: successMsg,
          speechText: successMsg,
          actionData: {
            shopSuccess: true,
            navigation: {
              label: MASCOT_UI.actions.viewShop[language],
              path: '/artisan/profile?tab=shop',
            },
          },
          timestamp: new Date(),
        },
      ])
      speakResponse(successMsg)
      setIsShowingPreview(false)
      setMode('AMA')
    } catch (err) {
      console.error('Error creating shop:', err)
      const errMsg = `${MASCOT_UI.feedback.errorOccurred[language]} (${err.message})`
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
      speakResponse(errMsg)
    } finally {
      setIsSaving(false)
    }
  }

  // Final Confirmation & Submission for Product
  const handleConfirmPublishProduct = async () => {
    setIsSaving(true)
    stopAudio()

    try {
      const title = (guidedAnswers.title || '').trim()
      const category = (guidedAnswers.category || 'Handicrafts').trim()
      const description = (guidedAnswers.description || '').trim()
      const price = Number(guidedAnswers.price) || 0
      const stock = Number(guidedAnswers.stock) || 1
      const materials = (guidedAnswers.materials || '').trim()
      const craftTime = (guidedAnswers.craftTime || '').trim()

      let listingRes
      if (guidedImageFile) {
        const formData = new FormData()
        formData.append('title', title)
        formData.append('category', category)
        formData.append('description', description)
        formData.append('price', price)
        formData.append('stock', stock)
        formData.append('materials', materials)
        formData.append('craftTime', craftTime)
        formData.append('image', guidedImageFile)
        formData.append('images', guidedImageFile)
        listingRes = await createArtisanListingApi(formData)
      } else {
        listingRes = await createArtisanListingApi({
          title,
          category,
          description,
          price,
          stock,
          materials,
          craftTime,
        })
      }

      const listingId = listingRes?.listing?._id || listingRes?.listing?.id
      if (listingId) {
        try {
          await publishArtisanListingApi(listingId)
        } catch (_) {}
      }

      const successMsg = MASCOT_UI.feedback.productPublishedSuccess[language]
      setMessages((prev) => [
        ...prev,
        {
          id: `success-product-${Date.now()}`,
          sender: 'assistant',
          text: successMsg,
          speechText: successMsg,
          actionData: {
            productSuccess: true,
            navigation: {
              label: MASCOT_UI.actions.viewProduct[language],
              path: '/artisan/profile?tab=products',
            },
          },
          timestamp: new Date(),
        },
      ])
      speakResponse(successMsg)
      setIsShowingPreview(false)
      setMode('AMA')
    } catch (err) {
      console.error('Error creating product:', err)
      const errMsg = `${MASCOT_UI.feedback.errorOccurred[language]} (${err.message})`
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
      speakResponse(errMsg)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle general message sending (AMA mode or interruption in guided mode)
  const handleSendMessage = useCallback(
    async (textToSend, preferredInputLanguage = null) => {
      const msg = (textToSend || inputMessage).trim()
      if (!msg) return

      stopAudio()
      setInputMessage('')
      setLiveTranscript('')

      // If currently in a guided workflow question, route input as answer
      if (mode !== 'AMA' && !isShowingPreview && activeQuestion) {
        handleAnswerGuidedQuestion(msg)
        return
      }

      setRobotState('processing')

      const clientDetected =
        preferredInputLanguage || detectClientLanguage(msg, language)
      if (clientDetected !== language) {
        setLanguage(clientDetected)
      }

      // Add user message to UI
      const userMsgObj = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: msg,
        detectedLang: clientDetected,
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
          language: clientDetected,
          preserveLanguage: preferredInputLanguage === 'pa',
        })

        if (!res?.success) {
          throw new Error(res?.message || 'Assistant request failed')
        }

        const finalLang = res.detectedLanguage || clientDetected
        if (finalLang !== language) {
          setLanguage(finalLang)
        }
        if (res.actionData?.user) {
          authenticate(res.actionData.user)
        }

        // Check if backend intent requested starting a guided workflow
        if (res.actionData?.guidedMode === 'shop') {
          handleStartShopCreation(finalLang)
          return
        }
        if (res.actionData?.guidedMode === 'product') {
          handleStartProductCreation(finalLang)
          return
        }

        const assistantMsgObj = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: res.reply,
          speechText: res.speechText || res.reply,
          actionData: res.actionData || null,
          detectedLang: finalLang,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMsgObj])
        setPendingAction(res.pendingAction || null)
        setRobotState('idle')

        speakResponse(res.speechText || res.reply, finalLang)
      } catch (err) {
        console.error('Assistant error:', err)
        const errMsg = MASCOT_UI.feedback.errorOccurred[language]

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
        speakResponse(errMsg, clientDetected)
      }
    },
    [
      inputMessage,
      messages,
      pendingAction,
      language,
      stopAudio,
      speakResponse,
      mode,
      isShowingPreview,
      activeQuestion,
      authenticate,
      handleAnswerGuidedQuestion,
      handleStartProductCreation,
      handleStartShopCreation,
    ]
  )

  const startBrowserRecognition = useCallback(
    (targetLanguage) => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        setMicError(
          targetLanguage === 'pa'
            ? 'ਬ੍ਰਾਉਜ਼ਰ ਸਪੀਚ ਰਿਕੋਗਨੀਸ਼ਨ ਦਾ ਸਮਰਥਨ ਨਹੀਂ ਕਰਦਾ। ਕਿਰਪਾ ਕਰਕੇ Chrome ਵਰਤੋ ਜਾਂ ਹੇਠਾਂ ਲਿਖੋ।'
            : targetLanguage === 'hi'
              ? 'ब्राउज़र स्पीच रिकॉग्निशन का समर्थन नहीं करता। कृपया Chrome का उपयोग करें या नीचे लिखें।'
              : 'Your browser does not support speech recognition. Please use Chrome or type below.'
        )
        return false
      }

      try {
        const recognition = new SpeechRecognition()
        recognitionRef.current = recognition
        recognition.lang = LANGUAGE_LOCALES[targetLanguage] || 'en-IN'
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
            if (event.results[i].isFinal) final += transcript
            else interim += transcript
          }

          setLiveTranscript((final || interim).trim())
          if (final.trim()) {
            recognition.stop()
            handleSendMessage(
              final.trim(),
              targetLanguage === 'pa' ? 'pa' : null
            )
          }
        }

        recognition.onerror = (event) => {
          console.warn('Speech recognition error:', event.error)
          isListeningRef.current = false
          if (event.error === 'not-allowed') {
            setMicError(
              targetLanguage === 'pa'
                ? 'ਕਿਰਪਾ ਕਰਕੇ ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਇਜਾਜ਼ਤ ਦਿਓ ਜੀ।'
                : targetLanguage === 'hi'
                  ? 'कृपया माइक्रोफ़ोन की अनुमति दें जी।'
                  : 'Please allow microphone access in your browser settings.'
            )
          } else if (event.error !== 'aborted') {
            setMicError(
              targetLanguage === 'pa'
                ? 'ਆਵਾਜ਼ ਪਛਾਣਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ ਹੇਠਾਂ ਲਿਖੋ।'
                : targetLanguage === 'hi'
                  ? 'आवाज़ पहचानने में समस्या आई। कृपया फिर कोशिश करें या नीचे लिखें।'
                  : 'Speech recognition failed. Please try again or type below.'
            )
          }
          setRobotState('idle')
        }

        recognition.onend = () => {
          isListeningRef.current = false
          setRobotState((current) => current === 'listening' ? 'idle' : current)
        }

        recognition.start()
        return true
      } catch (error) {
        console.error('Failed to start speech recognition:', error)
        setMicError(
          targetLanguage === 'pa'
            ? 'ਆਵਾਜ਼ ਪਛਾਣ ਸ਼ੁਰੂ ਨਹੀਂ ਹੋ ਸਕੀ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ ਹੇਠਾਂ ਲਿਖੋ।'
            : error.message
        )
        setRobotState('idle')
        return false
      }
    },
    [handleSendMessage]
  )

  const startPunjabiRecording = useCallback(async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof window.MediaRecorder === 'undefined'
    ) {
      startBrowserRecognition('pa')
      return
    }

    const requestId = ++recordingRequestRef.current
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (recordingRequestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
        (type) => window.MediaRecorder.isTypeSupported?.(type)
      )
      const recorder = mimeType
        ? new window.MediaRecorder(stream, { mimeType })
        : new window.MediaRecorder(stream)
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      recordingChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        isListeningRef.current = false
        window.clearTimeout(recorderMonitorTimerRef.current)
        window.clearTimeout(recorderMaxTimerRef.current)
        recorderMonitorTimerRef.current = null
        recorderMaxTimerRef.current = null
        if (recorderAudioContextRef.current?.state !== 'closed') {
          recorderAudioContextRef.current?.close()
        }
        recorderAudioContextRef.current = null
        const audio = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        recordingChunksRef.current = []
        stream.getTracks().forEach((track) => track.stop())
        if (mediaStreamRef.current === stream) mediaStreamRef.current = null
        if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null
        if (!audio.size) {
          setRobotState('idle')
          return
        }

        setRobotState('processing')
        try {
          const result = await transcribeVoiceAudioApi(audio, 'pa')
          const transcript = result?.text?.trim()
          if (!transcript) {
            setRobotState('idle')
            console.warn('Punjabi transcription returned no text; trying browser recognition.')
            startBrowserRecognition('pa')
            return
          }
          setLiveTranscript(transcript)
          handleSendMessage(transcript, 'pa')
        } catch (error) {
          console.error('Punjabi speech transcription failed:', error)
          setRobotState('idle')
          startBrowserRecognition('pa')
        }
      }

      recorder.onerror = (event) => {
        console.error('Punjabi audio recording failed:', event.error)
        isListeningRef.current = false
        window.clearTimeout(recorderMonitorTimerRef.current)
        window.clearTimeout(recorderMaxTimerRef.current)
        recorderMonitorTimerRef.current = null
        recorderMaxTimerRef.current = null
        if (recorderAudioContextRef.current?.state !== 'closed') {
          recorderAudioContextRef.current?.close()
        }
        recorderAudioContextRef.current = null
        stream.getTracks().forEach((track) => track.stop())
        if (mediaStreamRef.current === stream) mediaStreamRef.current = null
        if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null
        setRobotState('idle')
        startBrowserRecognition('pa')
      }

      recorder.start()
      isListeningRef.current = true
      setRobotState('listening')

      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
      if (AudioContextConstructor) {
        try {
          const audioContext = new AudioContextConstructor()
          const analyser = audioContext.createAnalyser()
          analyser.fftSize = 512
          audioContext.createMediaStreamSource(stream).connect(analyser)
          recorderAudioContextRef.current = audioContext
          const samples = new Uint8Array(analyser.fftSize)
          let heardSpeech = false
          let silenceStartedAt = 0
          const monitorAudio = () => {
            if (mediaRecorderRef.current !== recorder || recorder.state !== 'recording') {
              return
            }
            analyser.getByteTimeDomainData(samples)
            const amplitude = Math.sqrt(
              samples.reduce((sum, sample) => sum + (sample - 128) ** 2, 0) /
                samples.length
            ) / 128
            const now = Date.now()
            if (amplitude > 0.02) {
              heardSpeech = true
              silenceStartedAt = 0
            } else if (heardSpeech) {
              if (!silenceStartedAt) silenceStartedAt = now
              if (now - silenceStartedAt >= 1800) {
                recorder.stop()
                return
              }
            }
            recorderMonitorTimerRef.current = window.setTimeout(monitorAudio, 150)
          }
          monitorAudio()
        } catch (error) {
          console.warn('Punjabi silence detection unavailable:', error)
        }
      }
      recorderMaxTimerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 20000)
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop())
      if (recordingRequestRef.current !== requestId) return
      window.clearTimeout(recorderMonitorTimerRef.current)
      window.clearTimeout(recorderMaxTimerRef.current)
      if (recorderAudioContextRef.current?.state !== 'closed') {
        recorderAudioContextRef.current?.close()
      }
      recorderAudioContextRef.current = null
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      recordingChunksRef.current = []
      console.error('Could not start Punjabi audio recording:', error)
      startBrowserRecognition('pa')
    }
  }, [handleSendMessage, startBrowserRecognition])

  const stopListening = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder?.state === 'recording') {
      isListeningRef.current = false
      setRobotState('processing')
      recorder.stop()
      return
    }
    stopAudio()
  }, [stopAudio])

  // Prefer server transcription for Punjabi and fall back to browser recognition.
  const startListening = useCallback(() => {
    stopAudio()
    setMicError('')
    setLiveTranscript('')

    if (language === 'pa') {
      startPunjabiRecording()
      return
    }

    startBrowserRecognition(language)
  }, [language, startBrowserRecognition, startPunjabiRecording, stopAudio])

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
    setMode('AMA')
    setGuidedStep(0)
    setGuidedAnswers({})
    setGuidedImageFile(null)
    setGuidedImagePreview(null)
    setGuidedError('')
    setIsShowingPreview(false)
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

  // Suggestion Chips based on user role and language
  const suggestionChips = useMemo(() => {
    if (activeUser?.accountType === 'artisan') {
      return MASCOT_UI.suggestions.artisan[language] || []
    }
    if (activeUser?.accountType === 'customer') {
      return MASCOT_UI.suggestions.customer[language] || []
    }
    return MASCOT_UI.suggestions.guest[language] || []
  }, [activeUser, language])

  // Header Titles
  const headerInfo = useMemo(() => {
    if (activeUser?.accountType === 'artisan') {
      return {
        title:
          language === 'pa'
            ? 'ਦਸਤਕਾਰ AI ਸਟੂਡੀਓ'
            : language === 'hi'
            ? 'कारीगर AI स्टूडियो'
            : 'Artisan AI Studio',
        subtitle:
          language === 'pa'
            ? 'ਦੁਕਾਨ · ਉਤਪਾਦ · ਆਰਡਰ · ਕਮਾਈ'
            : language === 'hi'
            ? 'दुकान · उत्पाद · ऑर्डर · कमाई'
            : 'Shop · Products · Orders · Earnings',
      }
    }
    if (activeUser?.accountType === 'customer') {
      return {
        title:
          language === 'pa'
            ? 'ਦਸਤਕਾਰੀ ਸਹਾਇਕ'
            : language === 'hi'
            ? 'हस्तशिल्प सहायक'
            : 'Craft Assistant',
        subtitle:
          language === 'pa'
            ? 'ਖਰੀਦਦਾਰੀ · ਲਾਈਵ ਆਰਡਰ ਟ੍ਰੈਕਿੰਗ · ਸਹਾਇਤਾ'
            : language === 'hi'
            ? 'खरीदारी · लाइव ऑर्डर ट्रैकिंग · सहायता'
            : 'Shopping · Order Tracking · Support',
      }
    }
    return {
      title:
        language === 'pa'
          ? 'ਸਕਿੱਲਬ੍ਰਿਜ AI ਮੈਸਕੌਟ'
          : language === 'hi'
          ? 'स्किलब्रिज AI मैस्कॉट'
          : 'SkillBridge AI Mascot',
      subtitle:
        language === 'pa'
          ? 'ਬਹੁਭਾਸ਼ਾਈ ਵਾਇਸ ਤੇ ਸਮਾਰਟ ਸਹਾਇਕ'
          : language === 'hi'
          ? 'बहुभाषी वॉइस व स्मार्ट सहायक'
          : 'Multilingual Voice & Smart Platform Assistant',
    }
  }, [activeUser, language])

  if (!isOpen) return null

  return (
    <div
      aria-label="SkillBridge AI Assistant Mascot"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
      role="dialog"
    >
      <div className="relative flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl border-l border-border transition-transform duration-300 sm:max-w-md md:max-w-lg">
        {/* 1. Top Header */}
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
            {/* Multilingual Selector */}
            <div className="flex items-center gap-0.5 rounded-full bg-surface border border-border p-0.5 shadow-2xs">
              {LANGUAGES.map((l) => (
                <button
                  className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold transition-all cursor-pointer ${
                    language === l.code
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                  key={l.code}
                  onClick={() => handleLanguageChange(l.code)}
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
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-rose-500" />
              ) : (
                <Volume2 className="h-4 w-4 text-primary" />
              )}
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
        <div className="relative flex flex-col items-center justify-center border-b border-border/60 bg-gradient-to-b from-surface-muted/40 via-surface to-background/50 py-2.5 px-4">
          {/* Status Capsule */}
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-0.5 text-[10px] font-bold text-secondary shadow-2xs">
            {robotState === 'listening' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{MASCOT_UI.status.listening[language]}</span>
              </>
            ) : robotState === 'speaking' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>{MASCOT_UI.status.speaking[language]}</span>
              </>
            ) : robotState === 'processing' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-spin" />
                <span>{MASCOT_UI.status.processing[language]}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-secondary animate-spin-slow" />
                <span>{MASCOT_UI.status.ready[language]}</span>
              </>
            )}
          </div>

          <div
            className="cursor-pointer transition-transform hover:scale-102"
            onClick={() => {
              if (robotState === 'idle') startListening()
              else if (robotState === 'listening') stopListening()
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

        {/* 3. Three Main Mascot Conversation Options */}
        <div className="border-b border-border/70 bg-surface px-3 py-2 sm:px-4">
          <div className="grid grid-cols-3 gap-1.5">
            {/* Option 1: Create My Shop */}
            <button
              className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all cursor-pointer ${
                mode === 'GUIDED_SHOP'
                  ? 'border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20'
                  : 'border-border/80 bg-surface-muted/60 text-text-main hover:bg-surface hover:border-primary/40'
              }`}
              onClick={handleStartShopCreation}
              type="button"
            >
              <Store className="h-4 w-4 mb-0.5 text-primary" />
              <span className="text-[11px] font-bold leading-tight">
                {MASCOT_UI.options.createShop[language]}
              </span>
            </button>

            {/* Option 2: Add a Product */}
            <button
              className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all cursor-pointer ${
                mode === 'GUIDED_PRODUCT'
                  ? 'border-secondary bg-secondary/10 text-secondary shadow-xs ring-2 ring-secondary/20'
                  : 'border-border/80 bg-surface-muted/60 text-text-main hover:bg-surface hover:border-secondary/40'
              }`}
              onClick={handleStartProductCreation}
              type="button"
            >
              <PackagePlus className="h-4 w-4 mb-0.5 text-secondary" />
              <span className="text-[11px] font-bold leading-tight">
                {MASCOT_UI.options.addProduct[language]}
              </span>
            </button>

            {/* Option 3: Ask Me Anything */}
            <button
              className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all cursor-pointer ${
                mode === 'AMA'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-xs ring-2 ring-indigo-200'
                  : 'border-border/80 bg-surface-muted/60 text-text-main hover:bg-surface hover:border-indigo-400'
              }`}
              onClick={handleSwitchToAMA}
              type="button"
            >
              <HelpCircle className="h-4 w-4 mb-0.5 text-indigo-600" />
              <span className="text-[11px] font-bold leading-tight">
                {MASCOT_UI.options.askAnything[language]}
              </span>
            </button>
          </div>
        </div>

        {/* 4. Guided Workflow Header & Progress Indicator */}
        {mode !== 'AMA' && !isShowingPreview && activeQuestion && (
          <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold h-5 px-2">
                {formatProgress(guidedStep + 1, currentQuestions.length, language)}
              </span>
              <span className="font-semibold text-text-main">
                {mode === 'GUIDED_SHOP'
                  ? MASCOT_UI.options.createShop[language]
                  : MASCOT_UI.options.addProduct[language]}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {guidedStep > 0 && (
                <button
                  className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-white px-2 py-0.5 text-[10px] font-bold text-text-secondary hover:text-primary transition cursor-pointer"
                  onClick={handleGoBack}
                  type="button"
                >
                  <ChevronLeft className="h-3 w-3" />
                  <span>{MASCOT_UI.actions.back[language]}</span>
                </button>
              )}
              <button
                className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                onClick={handleCancelWorkflow}
                type="button"
              >
                {MASCOT_UI.actions.cancel[language]}
              </button>
            </div>
          </div>
        )}

        {/* 5. Main Chat & Interaction Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 sm:px-5 bg-background/30">
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

                {msg.imagePreview && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-white/30">
                    <img
                      alt="Uploaded preview"
                      className="h-28 w-28 object-cover"
                      src={msg.imagePreview}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons inside message cards */}
              {msg.actionData?.requireShop && (
                <div className="mt-2 w-full max-w-[90%] rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-xs">
                  <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-amber-700" />
                    <span>{MASCOT_UI.feedback.requireShopFirst[language]}</span>
                  </p>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:scale-102 transition cursor-pointer"
                    onClick={handleStartShopCreation}
                    type="button"
                  >
                    <span>{MASCOT_UI.options.createShop[language]}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {msg.actionData?.navigation && (
                <div className="mt-2 w-full max-w-[90%] rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 to-secondary/10 p-3 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-main flex items-center gap-1.5 truncate">
                      <Sparkles className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span>{msg.actionData.navigation.label}</span>
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:scale-102 transition cursor-pointer shrink-0"
                    onClick={() => handleNavigationAction(msg.actionData.navigation)}
                    type="button"
                  >
                    <span>Open</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Real-time Voice Transcription Bubble */}
          {liveTranscript && (
            <div className="rounded-2xl border border-secondary/40 bg-secondary/10 p-3 text-center text-xs font-semibold text-text-main animate-pulse">
              <span className="text-[10px] text-secondary block font-bold uppercase tracking-wider mb-0.5">
                {language === 'pa'
                  ? 'ਸੁਣ ਰਿਹਾ ਹਾਂ...'
                  : language === 'hi'
                  ? 'सुन रहा हूँ...'
                  : 'Hearing voice input:'}
              </span>
              &quot;{liveTranscript}&quot;
            </div>
          )}

          {/* Validation Error Message */}
          {guidedError && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800 flex items-center gap-2 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{guidedError}</span>
            </div>
          )}

          {/* Inline Image Upload Area when Question expects image */}
          {mode !== 'AMA' && !isShowingPreview && activeQuestion?.isImageUpload && (
            <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-3">
              {guidedImagePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    alt="Preview"
                    className="h-28 w-28 object-cover rounded-xl border border-primary/40 shadow-xs"
                    src={guidedImagePreview}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-primary hover:underline cursor-pointer">
                      {MASCOT_UI.actions.changeImage[language]}
                      <input
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileSelect}
                        type="file"
                      />
                    </label>
                    <button
                      className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover cursor-pointer"
                      onClick={() => proceedToNextQuestion(guidedStep + 1, guidedAnswers)}
                      type="button"
                    >
                      {MASCOT_UI.actions.next[language]}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="h-8 w-8 text-primary animate-bounce-subtle" />
                  <p className="text-xs font-semibold text-text-main">
                    {activeQuestion.prompts[language].hint}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover cursor-pointer">
                      <Camera className="h-4 w-4" />
                      <span>{MASCOT_UI.actions.uploadImage[language]}</span>
                      <input
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileSelect}
                        type="file"
                      />
                    </label>
                    {!activeQuestion.required && (
                      <button
                        className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-text-secondary hover:bg-surface-muted transition cursor-pointer"
                        onClick={handleSkipQuestion}
                        type="button"
                      >
                        {MASCOT_UI.actions.skip[language]}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Guided Preview & Confirmation Card */}
          {isShowingPreview && (
            <div className="rounded-2xl border-2 border-primary/40 bg-surface p-4 shadow-md space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <h3 className="font-serif text-sm font-bold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    {mode === 'GUIDED_SHOP'
                      ? MASCOT_UI.preview.shopTitle[language]
                      : MASCOT_UI.preview.productTitle[language]}
                  </span>
                </h3>
              </div>

              {/* Preview Rows with Edit buttons */}
              <div className="space-y-2 text-xs">
                {currentQuestions.map((q, idx) => {
                  const val = guidedAnswers[q.key]
                  let label = q.prompts[language].display

                  if (mode === 'GUIDED_SHOP') {
                    if (q.key === 'name') label = MASCOT_UI.preview.name[language]
                    if (q.key === 'category') label = MASCOT_UI.preview.category[language]
                    if (q.key === 'description') label = MASCOT_UI.preview.description[language]
                    if (q.key === 'location') label = MASCOT_UI.preview.location[language]
                    if (q.key === 'speciality') label = MASCOT_UI.preview.speciality[language]
                    if (q.key === 'logo') label = MASCOT_UI.preview.logo[language]
                  } else {
                    if (q.key === 'title') label = MASCOT_UI.preview.productName[language]
                    if (q.key === 'category') label = MASCOT_UI.preview.category[language]
                    if (q.key === 'description') label = MASCOT_UI.preview.description[language]
                    if (q.key === 'price') label = MASCOT_UI.preview.price[language]
                    if (q.key === 'stock') label = MASCOT_UI.preview.stock[language]
                    if (q.key === 'materials') label = MASCOT_UI.preview.materials[language]
                    if (q.key === 'craftTime') label = MASCOT_UI.preview.craftTime[language]
                    if (q.key === 'image') label = MASCOT_UI.preview.image[language]
                  }

                  return (
                    <div
                      className="flex items-start justify-between gap-2 rounded-xl bg-surface-muted/60 p-2.5 border border-border/60"
                      key={q.key}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                          {label}
                        </span>
                        {q.isImageUpload && guidedImagePreview ? (
                          <img
                            alt="Uploaded"
                            className="mt-1 h-14 w-14 object-cover rounded-lg border border-border"
                            src={guidedImagePreview}
                          />
                        ) : (
                          <p className="font-semibold text-text-main break-words mt-0.5">
                            {q.key === 'price' && val ? `₹${val}` : val || MASCOT_UI.preview.notProvided[language]}
                          </p>
                        )}
                      </div>

                      <button
                        className="rounded-lg border border-border bg-white px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition cursor-pointer shrink-0"
                        onClick={() => handleEditField(idx)}
                        type="button"
                      >
                        {MASCOT_UI.actions.edit[language]}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Confirmation Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-2.5 text-xs font-bold text-white shadow-xs hover:brightness-105 transition cursor-pointer disabled:opacity-50"
                  disabled={isSaving}
                  onClick={
                    mode === 'GUIDED_SHOP'
                      ? handleConfirmCreateShop
                      : handleConfirmPublishProduct
                  }
                  type="button"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{MASCOT_UI.actions.saving[language]}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>
                        {mode === 'GUIDED_SHOP'
                          ? MASCOT_UI.actions.confirmCreateShop[language]
                          : MASCOT_UI.actions.confirmPublishProduct[language]}
                      </span>
                    </>
                  )}
                </button>

                <button
                  className="w-full rounded-xl border border-border bg-white py-2 text-xs font-bold text-text-secondary hover:bg-surface-muted transition cursor-pointer"
                  disabled={isSaving}
                  onClick={handleCancelWorkflow}
                  type="button"
                >
                  {MASCOT_UI.actions.cancel[language]}
                </button>
              </div>
            </div>
          )}

          {/* Pending Affirmation Banner */}
          {pendingAction && (
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 shadow-sm animate-fadeIn">
              <p className="text-xs font-bold text-primary flex items-center gap-1.5 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {language === 'pa'
                    ? 'ਕਿਰਪਾ ਕਰਕੇ ਪੁਸ਼ਟੀ ਕਰੋ:'
                    : language === 'hi'
                    ? 'कृपया पुष्टि करें:'
                    : 'Please confirm:'}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
                  onClick={() => handleSendMessage('yes')}
                  type="button"
                >
                  <Check className="h-4 w-4" />
                  <span>{MASCOT_UI.actions.yes[language]}</span>
                </button>
                <button
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-bold text-text-secondary hover:bg-surface-muted transition cursor-pointer"
                  onClick={() => handleSendMessage('no')}
                  type="button"
                >
                  <X className="h-4 w-4" />
                  <span>{MASCOT_UI.actions.no[language]}</span>
                </button>
              </div>
            </div>
          )}

          {/* Mic error warning */}
          {micError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-2.5 text-center text-xs text-red-700">
              {micError}
            </div>
          )}

          {speechError && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* 7. Bottom Controls & Voice/Text Inputs */}
        <div className="border-t border-border/80 bg-surface p-3 sm:p-4 space-y-2.5">
          {/* Quick Suggestion Chips (when in AMA mode) */}
          {mode === 'AMA' && suggestionChips.length > 0 && (
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
          )}

          {/* Big Interactive Mic Button Controls */}
          <div className="flex items-center justify-center gap-4 pt-1">
            {/* Replay last audio button */}
            <button
              aria-label="Replay speech"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-muted text-text-secondary hover:text-primary hover:border-primary transition cursor-pointer"
              onClick={() => {
                if (lastSpokenText) speakResponse(lastSpokenText)
              }}
              title="Replay speech"
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
                aria-label={
                  robotState === 'listening'
                    ? language === 'pa'
                      ? 'Listening; tap to send'
                      : 'Listening...'
                    : 'Tap to speak'
                }
                className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  robotState === 'listening'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-300 animate-pulse'
                    : robotState === 'speaking'
                    ? 'bg-primary text-white ring-4 ring-primary/30'
                    : 'bg-gradient-to-tr from-primary to-secondary text-white hover:brightness-105 ring-4 ring-secondary/20 hover:scale-105'
                }`}
                onClick={() => {
                  if (robotState === 'listening') {
                    stopListening()
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
                ? "ਬੋਲੋ ਜੀ... ਰੁਕਣ 'ਤੇ ਆਵਾਜ਼ ਆਪਣੇ ਆਪ ਭੇਜੀ ਜਾਵੇਗੀ"
                : language === 'hi'
                ? 'बोलिए जी... मैं सुन रहा हूँ'
                : 'Listening... speak your answer now'
              : language === 'pa'
              ? 'ਬੋਲਣ ਲਈ ਮਾਈਕ ਦਬਾਓ ਜਾਂ ਹੇਠਾਂ ਲਿਖੋ'
              : language === 'hi'
              ? 'बोलने के लिए माइक दबाएं या नीचे लिखें'
              : 'Tap mic to speak or type answer below'}
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
                mode === 'GUIDED_SHOP' || mode === 'GUIDED_PRODUCT'
                  ? activeQuestion?.prompts[language]?.hint ||
                    (language === 'pa'
                      ? 'ਆਪਣਾ ਜਵਾਬ ਲਿਖੋ...'
                      : language === 'hi'
                      ? 'अपना उत्तर लिखें...'
                      : 'Type your answer...')
                  : language === 'pa'
                  ? "ਕੁਝ ਵੀ ਪੁੱਛੋ (ਜਿਵੇਂ 'ਦੁਕਾਨ ਬਣਾਓ', 'ਉਤਪਾਦ ਜੋੜੋ')..."
                  : language === 'hi'
                  ? "कुछ भी पूछें (जैसे 'दुकान बनाएँ', 'उत्पाद जोड़ें')..."
                  : "Ask anything (e.g. 'Create shop', 'Add product')..."
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
