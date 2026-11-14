import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bot,
  Camera,
  Check,
  CheckCircle2,
<<<<<<< HEAD
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
=======
  ChevronDown,
  Clock,
  Copy,
  Edit3,
  MapPin,
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
  Mic,
  Package,
  PackagePlus,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
<<<<<<< HEAD
  Store,
  Trash2,
  UploadCloud,
=======
  UserCheck,
  UserRound,
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react'
import RobotAvatar from './RobotAvatar'
import VoiceWaveform from './VoiceWaveform'
import { sendVoiceAssistantMessageApi } from '../../services/voice-api'
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

<<<<<<< HEAD
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
=======
/**
 * Phonetic Gurmukhi to Devanagari mathematical transliteration
 * Offsets Gurmukhi code points (0x0A00-0x0A75) to Devanagari (0x0900-0x0975)
 * Allows Indian TTS engines (e.g. Google Hindi, Microsoft Heera) to vocalize Punjabi naturally
 */
function gurmukhiToDevanagariPhonetic(text = '') {
  return text
    .split('')
    .map((c) => {
      const code = c.charCodeAt(0)
      if (code >= 0x0a00 && code <= 0x0a75) {
        return String.fromCharCode(code - 0x0100)
      }
      return c
    })
    .join('')
}

/**
 * Client-side language detection
 */
function detectClientLanguage(text = '') {
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa' // Gurmukhi
  if (/[\u0900-\u097F]/.test(text)) return 'hi' // Devanagari

  const lower = text.toLowerCase()
  const paWords = ['kamm', 'kardi', 'karda', 'tajrba', 'mera na', 'pind', 'patiala', 'amritsar', 'sat sri akal', 'phulkari', 'silai', 'jodo']
  const hiWords = ['karti hoon', 'karta hoon', 'anubhav', 'saal', 'gaon', 'shahar', 'namaste', 'batao', 'kamai', 'silai']

  for (const w of paWords) {
    if (lower.includes(w)) return 'pa'
  }
  for (const w of hiWords) {
    if (lower.includes(w)) return 'hi'
  }
  return 'en'
}

function getWelcomeContent(lang, activeUser) {
  if (activeUser?.accountType === 'artisan') {
    return {
      text:
        lang === 'pa'
          ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${activeUser.name} ਜੀ! ਮੈਂ ਤੁਹਾਡਾ ਦਸਤਕਾਰ ਵਾਇਸ ਓਪਰੇਟਰ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਕਹਿ ਸਕਦੇ ਹੋ:
• "ਮੈਂ ਸਿਲਾਈ ਦਾ ਕੰਮ ਕਰਦੀ ਹਾਂ ਅਤੇ ਮੈਨੂੰ ਪੰਜ ਸਾਲ ਦਾ ਤਜਰਬਾ ਹੈ"
• "ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ ਦਿਖਾਓ" ਜਾਂ "ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰੋ"
• "ਕਢਾਈ ਦਾ ਹੁਨਰ ਜੋੜੋ" ਜਾਂ "ਨਵਾਂ ਉਤਪਾਦ ਜੋੜੋ"`
          : lang === 'hi'
          ? `नमस्ते ${activeUser.name} जी! मैं आपका कारीगर वॉइस ऑपरेटर हूँ। आप बोल सकते हैं:
• "मैं सिलाई का काम करती हूँ और मुझे पाँच साल का अनुभव है"
• "मेरी प्रोफाइल दिखाओ" या "प्रोफाइल पूरी करो"
• "कढ़ाई का हुनर जोड़ो" या "नया उत्पाद जोड़ो"`
          : `Hello ${activeUser.name}! I am your Artisan Voice Operator. You can speak commands like:
• "I am a tailor with five years of experience."
• "Show my profile" or "Complete my profile"
• "Add embroidery to my skills" or "Add a product"`,
      speechText:
        lang === 'pa'
          ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${activeUser.name} ਜੀ! ਮੈਂ ਤੁਹਾਡਾ ਦਸਤਕਾਰ ਵਾਇਸ ਓਪਰੇਟਰ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਪ੍ਰੋਫਾਈਲ ਬਣਾਉਣ, ਹੁਨਰ ਜੋੜਨ ਜਾਂ ਆਰਡਰ ਦੇਖਣ ਲਈ ਕਹਿ ਸਕਦੇ ਹੋ।`
          : lang === 'hi'
          ? `नमस्ते ${activeUser.name} जी! मैं आपका कारीगर वॉइस ऑपरेटर हूँ। आप मुझसे बोलकर प्रोफाइल अपडेट कर सकते हैं, हुनर जोड़ सकते हैं और उत्पाद लिस्ट कर सकते हैं।`
          : `Hello ${activeUser.name}! I am your Artisan Voice Operator. Speak commands to update your profile, add skills, or manage products.`,
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
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
<<<<<<< HEAD
    text: 'Hello! I am your SkillBridge AI Mascot & Assistant. Ask me how to discover authentic crafts, track deliveries, register hands-free as an artisan, or manage your shop!',
    speechText: 'Hello! I am your SkillBridge assistant. How can I help you today?',
=======
    text:
      lang === 'pa'
        ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਸਕਿੱਲਬ੍ਰਿਜ ਦਸਤਕਾਰ ਸਹਾਇਕ ਹਾਂ। ਤੁਸੀਂ ਬੋਲ ਕੇ ਆਪਣੀ ਦਸਤਕਾਰ ਪ੍ਰੋਫਾਈਲ ਬਣਾ ਸਕਦੇ ਹੋ, ਜਿਵੇਂ:
• "ਮੈਂ ਸਿਲਾਈ ਦਾ ਕੰਮ ਕਰਦੀ ਹਾਂ ਅਤੇ ਮੈਨੂੰ ਪੰਜ ਸਾਲ ਦਾ ਤਜਰਬਾ ਹੈ"
• "ਮੇਰਾ ਨਾਂ ਸੁਨੀਤਾ ਹੈ ਅਤੇ ਮੈਂ ਪਟਿਆਲੇ ਤੋਂ ਹਾਂ"`
        : lang === 'hi'
        ? `नमस्ते जी! मैं स्किलब्रिज कारीगर सहायक हूँ। आप बोलकर अपनी प्रोफाइल बना सकते हैं, जैसे:
• "मैं सिलाई का काम करती हूँ और मुझे पाँच साल का अनुभव है"
• "मेरा नाम सुनीता है और मैं पटियाला से हूँ"`
        : `Hello! I am your SkillBridge Artisan Operator. You can create your artisan profile simply by speaking:
• "I am a tailor with five years of experience."
• "My name is Sunita and I live in Patiala."`,
    speechText:
      lang === 'pa'
        ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ! ਮੈਂ ਸਕਿੱਲਬ੍ਰਿਜ ਦਸਤਕਾਰ ਸਹਾਇਕ ਹਾਂ। ਤੁਸੀਂ ਬੋਲ ਕੇ ਆਪਣੀ ਪ੍ਰੋਫਾਈਲ ਬਣਾ ਸਕਦੇ ਹੋ।`
        : lang === 'hi'
        ? `नमस्ते जी! मैं स्किलब्रिज कारीगर सहायक हूँ। आप बोलकर अपनी प्रोफाइल बना सकते हैं।`
        : `Hello! I am your SkillBridge artisan assistant. Speak to create or update your profile.`,
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
  }
}

const ArtisanVoiceAssistantDrawer = ({ isOpen, onClose, user: propUser }) => {
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
  const [isMuted, setIsMuted] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [inputMessage, setInputMessage] = useState('')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [pendingAction, setPendingAction] = useState(null)

  const initialWelcome = useMemo(() => {
    const welcome = getWelcomeContent(language, activeUser)
    return {
      id: 'welcome',
      sender: 'assistant',
      text: welcome.text,
      speechText: welcome.speechText,
      actionData: null,
      detectedLang: language,
    }
  }, [language, activeUser])

  const [messages, setMessages] = useState([initialWelcome])

<<<<<<< HEAD
  const chatBottomRef = useRef(null)
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const fileInputRef = useRef(null)

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
=======
  // Refresh welcome message if opened on a new page or user changes
  useEffect(() => {
    if (isOpen) {
      setMessages((prev) => {
        if (prev.length <= 1) {
          const fresh = getWelcomeContent(language, activeUser)
          return [
            {
              id: 'welcome',
              sender: 'assistant',
              text: fresh.text,
              speechText: fresh.speechText,
              actionData: null,
              detectedLang: language,
            },
          ]
        }
        return prev
      })
    }
  }, [isOpen, language, activeUser])

  const chatBottomRef = useRef(null)
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)
  const isSpeakingRef = useRef(false)

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveTranscript, pendingAction])
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638

  // Stop all audio & recognition
  const stopAudio = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    isSpeakingRef.current = false
    setIsMouthMoving(false)
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        /* ignore */
      }
      isListeningRef.current = false
    }
    if (robotState === 'speaking' || robotState === 'listening') {
      setRobotState('idle')
    }
  }, [robotState])

  // Clean text and speak via regional SpeechSynthesis voice
  const speakResponse = useCallback(
    (text, targetLang = language, onComplete) => {
      if (isMuted || !text || typeof window === 'undefined' || !window.speechSynthesis) {
        if (onComplete) onComplete()
        return
      }

      stopAudio()
      setRobotState('speaking')
      setIsMouthMoving(true)
      isSpeakingRef.current = true
      setLastSpokenText(text)

<<<<<<< HEAD
      // Clean speech text thoroughly
      const cleanSpoken = text
        .replace(/[*_#`~[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/₹\s*/g, 'Rupees ')
        .replace(/\s+/g, ' ')
        .trim()
=======
      const voices = window.speechSynthesis.getVoices()
      let utteranceText = text
      let voiceLocale = LANGUAGE_LOCALES[targetLang] || 'pa-IN'
      let matchedVoice = null
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638

      if (targetLang === 'pa') {
        // 1. Look for native Punjabi voice
        matchedVoice = voices.find(
          (v) => v.lang && (v.lang.toLowerCase().startsWith('pa') || v.lang.toLowerCase().includes('punjabi'))
        )
        // 2. If no Punjabi voice installed, use Indian Hindi voice with phonetic Devanagari conversion
        if (!matchedVoice) {
          matchedVoice = voices.find(
            (v) => v.lang && (v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().includes('hindi'))
          )
          if (matchedVoice) {
            utteranceText = gurmukhiToDevanagariPhonetic(text)
            voiceLocale = 'hi-IN'
          }
        }
        // 3. Fallback to Indian English voice
        if (!matchedVoice) {
          matchedVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes('in'))
        }
      } else if (targetLang === 'hi') {
        matchedVoice = voices.find(
          (v) => v.lang && (v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().includes('hindi'))
        )
        if (!matchedVoice) {
          matchedVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes('in'))
        }
      } else {
        matchedVoice = voices.find(
          (v) => v.lang && (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().startsWith('en'))
        )
      }

      const utterance = new SpeechSynthesisUtterance(utteranceText)
      utterance.lang = voiceLocale
      utterance.rate = 0.95
      utterance.pitch = 1.05
<<<<<<< HEAD

      // Select matching regional voice
      const voices = window.speechSynthesis.getVoices()
      const langPrefix = language === 'pa' ? 'pa' : language === 'hi' ? 'hi' : 'en'
      const matched = voices.find(
        (v) =>
          v.lang &&
          (v.lang.toLowerCase().startsWith(langPrefix) ||
            v.lang.toLowerCase().includes('in'))
      )
      if (matched) utterance.voice = matched
=======
      if (matchedVoice) utterance.voice = matchedVoice
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638

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

<<<<<<< HEAD
      const duration = Math.max(3000, cleanSpoken.length * 85)
=======
      // Safety timeout
      const duration = Math.max(3000, text.length * 95)
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
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
        speakResponse(prompt.spoken)
      }
    }
  }

  // Launch Guided Shop Creation
  const handleStartShopCreation = () => {
    stopAudio()
    setMode('GUIDED_SHOP')
    setGuidedStep(0)
    setGuidedAnswers({})
    setGuidedImageFile(null)
    setGuidedImagePreview(null)
    setGuidedError('')
    setIsShowingPreview(false)

    const q1 = SHOP_QUESTIONS[0]
    const spoken = q1.prompts[language].spoken
    const display = q1.prompts[language].display

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-mode-shop-${Date.now()}`,
        sender: 'assistant',
        text: `🏪 ${MASCOT_UI.options.createShop[language]}\n\n${formatProgress(1, SHOP_QUESTIONS.length, language)}\n${display}`,
        speechText: spoken,
        timestamp: new Date(),
      },
    ])
    speakResponse(spoken)
  }

  // Launch Guided Product Creation
  const handleStartProductCreation = () => {
    stopAudio()

    if (!activeUser) {
      const reqLogin = MASCOT_UI.feedback.loginRequired[language]
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
      speakResponse(reqLogin)
      return
    }

    // Check if artisan already has a shop
    if (!artisanShop) {
      const noShopNotice = MASCOT_UI.feedback.requireShopFirst[language]
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
      speakResponse(noShopNotice)
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
    const spoken = q1.prompts[language].spoken
    const display = q1.prompts[language].display

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-mode-product-${Date.now()}`,
        sender: 'assistant',
        text: `📦 ${MASCOT_UI.options.addProduct[language]}\n\n${formatProgress(1, PRODUCT_QUESTIONS.length, language)}\n${display}`,
        speechText: spoken,
        timestamp: new Date(),
      },
    ])
    speakResponse(spoken)
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
    async (textToSend) => {
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

      // Auto-detect spoken language from text
      const clientDetected = detectClientLanguage(msg)
      if (clientDetected && clientDetected !== language) {
        setLanguage(clientDetected)
      }

      // Add user message to UI
      const userMsgObj = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: msg,
        detectedLang: clientDetected,
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
          language: clientDetected || language,
        })

        if (!res?.success) {
          throw new Error(res?.message || 'Assistant request failed')
        }

<<<<<<< HEAD
        // Check if backend intent requested starting a guided workflow
        if (res.actionData?.guidedMode === 'shop') {
          handleStartShopCreation()
          return
        }
        if (res.actionData?.guidedMode === 'product') {
          handleStartProductCreation()
          return
=======
        // Auto-switch language if assistant detected a switch
        const finalLang = res.detectedLanguage || clientDetected || language
        if (finalLang && finalLang !== language) {
          setLanguage(finalLang)
        }

        // If user profile was updated or created, synchronize with auth context
        if (res.actionData?.user && authenticate) {
          authenticate(res.actionData.user)
        }

        // Set success state briefly if a confirmed database action occurred
        if (res.actionData?.profileCard || res.actionData?.product) {
          setRobotState('success')
          setTimeout(() => {
            if (robotState === 'success') setRobotState('idle')
          }, 2500)
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
        }

        const assistantMsgObj = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: res.reply,
          speechText: res.speechText || res.reply,
          actionData: res.actionData || null,
          detectedLang: finalLang,
        }

        setMessages((prev) => [...prev, assistantMsgObj])
        setPendingAction(res.pendingAction || null)

<<<<<<< HEAD
        speakResponse(res.speechText || res.reply)
=======
        // Speak the reply out loud in the matching language
        speakResponse(res.speechText || res.reply, finalLang)
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
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
            detectedLang: language,
          },
        ])
        setRobotState('idle')
        speakResponse(errMsg, language)
      }
    },
<<<<<<< HEAD
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
    ]
  )

  // Start Speech-to-Text Recognition
=======
    [inputMessage, messages, pendingAction, language, stopAudio, speakResponse, authenticate, robotState]
  )

  // Start Speech-to-Text Recognition with dynamic multilingual support
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
  const startListening = useCallback(() => {
    // Interrupt ongoing speech immediately
    stopAudio()
    setMicError('')
    setLiveTranscript('')

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setMicError(
        language === 'pa'
<<<<<<< HEAD
          ? 'ਬ੍ਰਾਉਜ਼ਰ ਸਪੀਚ ਰਿਕੋਗਨੀਸ਼ਨ ਦਾ ਸਮਰਥਨ ਨਹੀਂ ਕਰਦਾ। ਕਿਰਪਾ ਕਰਕੇ Google Chrome ਵਰਤੋ ਜਾਂ ਹੇਠਾਂ ਟਾਈਪ ਕਰੋ।'
          : language === 'hi'
          ? 'ब्राउज़र स्पीच रिकॉग्निशन का समर्थन नहीं करता। कृपया गूगल क्रोम का उपयोग करें या नीचे टाइप करें।'
          : 'Your browser does not support Speech Recognition. Please use Chrome or type below.'
=======
          ? 'ਬ੍ਰਾਉਜ਼ਰ ਸਪੀਚ ਰਿਕੋਗਨੀਸ਼ਨ ਦਾ ਸਮਰਥਨ ਨਹੀਂ ਕਰਦਾ। ਕਿਰਪਾ ਕਰਕੇ Google Chrome ਵਰਤੋ।'
          : language === 'hi'
          ? 'ब्राउज़र स्पीच रिकग्निशन समर्थित नहीं है। कृपया Google Chrome का उपयोग करें।'
          : 'Your browser does not support Speech Recognition. Please use Chrome.'
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
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
<<<<<<< HEAD
              : language === 'hi'
              ? 'कृपया माइक्रोफ़ोन की अनुमति दें जी।'
              : 'Please allow microphone access in your browser settings.'
=======
              : 'Please allow microphone access.'
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
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

  // Cancel ongoing action
  const handleCancelAction = useCallback(() => {
    handleSendMessage(language === 'pa' ? 'ਰੱਦ ਕਰੋ' : language === 'hi' ? 'रद्द करो' : 'cancel')
  }, [handleSendMessage, language])

  // Repeat last spoken response
  const handleRepeatLast = useCallback(() => {
    if (lastSpokenText) {
      speakResponse(lastSpokenText, language)
    }
  }, [lastSpokenText, speakResponse, language])

  // Copy message
  const handleCopy = (id, text) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

<<<<<<< HEAD
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
=======
  // Suggestion Chips tailored to Artisan Profile and Craft Actions
  const suggestionChips = useMemo(() => {
    if (activeUser?.accountType === 'artisan') {
      return [
        {
          label: language === 'pa' ? '👤 ਪ੍ਰੋਫਾਈਲ ਦਿਖਾਓ' : language === 'hi' ? '👤 मेरी प्रोफाइल' : '👤 Show Profile',
          command: language === 'pa' ? 'ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ ਦਿਖਾਓ' : language === 'hi' ? 'मेरी प्रोफाइल दिखाओ' : 'Show my profile details',
        },
        {
          label: language === 'pa' ? '✂️ ਸਿਲਾਈ ਤੇ 5 ਸਾਲ ਤਜਰਬਾ' : language === 'hi' ? '✂️ सिलाई व 5 साल अनुभव' : '✂️ Tailor & 5 yrs exp',
          command: language === 'pa' ? 'ਮੈਂ ਸਿਲਾਈ ਦਾ ਕੰਮ ਕਰਦੀ ਹਾਂ ਅਤੇ ਮੈਨੂੰ ਪੰਜ ਸਾਲ ਦਾ ਤਜਰਬਾ ਹੈ' : language === 'hi' ? 'मैं सिलाई का काम करती हूँ और मुझे पाँच साल का अनुभव है' : 'I am a tailor with five years of experience.',
        },
        {
          label: language === 'pa' ? '✨ ਹੁਨਰ ਜੋੜੋ (Add Skill)' : language === 'hi' ? '✨ हुनर जोड़ो' : '✨ Add Craft Skill',
          command: language === 'pa' ? 'ਕਢਾਈ ਦਾ ਹੁਨਰ ਜੋੜੋ' : language === 'hi' ? 'कढ़ाई का काम जोड़ो' : 'Add embroidery to my skills',
        },
        {
          label: language === 'pa' ? '✅ ਪ੍ਰੋਫਾਈਲ ਪੂਰੀ ਕਰੋ' : language === 'hi' ? '✅ प्रोफाइल पूरी करो' : '✅ Complete Profile',
          command: language === 'pa' ? 'ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਕੀ ਅਧੂਰਾ ਹੈ?' : language === 'hi' ? 'मेरी प्रोफाइल पूरी करो' : 'What is missing in my profile?',
        },
        {
          label: language === 'pa' ? '📦 ਨਵਾਂ ਉਤਪਾਦ' : language === 'hi' ? '📦 नया उत्पाद' : '📦 Add Product',
          command: language === 'pa' ? 'ਨਵਾਂ ਉਤਪਾਦ ਜੋੜੋ' : language === 'hi' ? 'नया उत्पाद जोड़ो' : 'Add a new product',
        },
        {
          label: language === 'pa' ? '💰 ਕੁੱਲ ਕਮਾਈ' : language === 'hi' ? '💰 मेरी कमाई' : '💰 Check Earnings',
          command: language === 'pa' ? 'ਮੇਰੀ ਕਮਾਈ ਦੱਸੋ' : language === 'hi' ? 'मेरी कमाई कितनी है' : 'How much have I earned?',
        },
      ]
    }

    return [
      {
        label: language === 'pa' ? '🎙️ ਬੋਲ ਕੇ ਪ੍ਰੋਫਾਈਲ ਬਣਾਓ' : language === 'hi' ? '🎙️ बोलकर प्रोफाइल बनाएं' : '🎙️ Create Profile by Voice',
        command: language === 'pa' ? 'ਮੈਂ ਸਿਲਾਈ ਦਾ ਕੰਮ ਕਰਦੀ ਹਾਂ ਅਤੇ ਮੈਨੂੰ ਪੰਜ ਸਾਲ ਦਾ ਤਜਰਬਾ ਹੈ' : language === 'hi' ? 'मैं सिलाई का काम करती हूँ और मुझे पाँच साल का अनुभव है' : 'I am a tailor with five years of experience.',
      },
      {
        label: language === 'pa' ? '📍 ਮੈਂ ਪਟਿਆਲੇ ਤੋਂ ਹਾਂ' : language === 'hi' ? '📍 मैं पटियाला से हूँ' : '📍 I live in Patiala',
        command: language === 'pa' ? 'ਮੈਂ ਪਟਿਆਲੇ ਤੋਂ ਹਾਂ' : language === 'hi' ? 'मैं पटियाला से हूँ' : 'I live in Patiala',
      },
      {
        label: language === 'pa' ? 'ℹ️ ਸਕਿੱਲਬ੍ਰਿਜ ਕੀ ਹੈ?' : language === 'hi' ? 'ℹ️ स्किलब्रिज क्या है?' : 'ℹ️ What is SkillBridge?',
        command: 'What is SkillBridge?',
      },
    ]
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
  }, [activeUser, language])

  if (!isOpen) return null

  return (
    <div
      aria-label="SkillBridge Artisan Voice Assistant"
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
      role="dialog"
    >
      <div className="relative flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl border-l border-border transition-transform duration-300 sm:max-w-md md:max-w-lg">
<<<<<<< HEAD
        {/* 1. Top Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-surface-muted/60 px-4 py-3 sm:px-5">
=======
        {/* 1. Header with dynamic language indicator */}
        <div className="flex items-center justify-between border-b border-border/80 bg-surface-muted/60 px-4 py-3 sm:px-6">
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-base font-bold text-text-main flex items-center gap-1.5">
                <span>Artisan Voice Operator</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-[0.68rem] text-secondary font-semibold uppercase tracking-wider">
                Action-Performing AI Assistant
              </p>
            </div>
          </div>

<<<<<<< HEAD
          <div className="flex items-center gap-1.5">
            {/* Multilingual Selector */}
            <div className="flex items-center gap-0.5 rounded-full bg-surface border border-border p-0.5 shadow-2xs">
=======
          <div className="flex items-center gap-2">
            {/* Multilingual Selector & Auto-detected Language Pill */}
            <div className="flex items-center gap-1 rounded-full bg-surface border border-border p-0.5 shadow-2xs">
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`rounded-full px-2 py-0.5 text-[0.68rem] font-bold transition-all ${
                    language === l.code
                      ? 'bg-primary text-white shadow-xs scale-105'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
<<<<<<< HEAD
                  key={l.code}
                  onClick={() => handleLanguageChange(l.code)}
=======
                  onClick={() => {
                    stopAudio()
                    setLanguage(l.code)
                  }}
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
                  type="button"
                >
                  {l.name}
                </button>
              ))}
            </div>

            {/* Mute Toggle */}
            <button
              aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text-main transition"
              onClick={() => {
                if (!isMuted) stopAudio()
                setIsMuted(!isMuted)
              }}
              type="button"
            >
<<<<<<< HEAD
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-rose-500" />
              ) : (
                <Volume2 className="h-4 w-4 text-primary" />
              )}
=======
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-primary" />}
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
            </button>

            {/* Close Button */}
            <button
              aria-label="Close assistant"
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text-main transition"
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

<<<<<<< HEAD
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
=======
        {/* 2. Central Mini Robot Stage */}
        <div className="flex flex-col items-center justify-center border-b border-border/50 bg-gradient-to-b from-surface-muted/30 to-surface py-2.5 px-4 relative">
          {/* Active Status Badge */}
          <div className="mb-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold shadow-2xs transition-all ${
                robotState === 'listening'
                  ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
                  : robotState === 'speaking'
                  ? 'bg-secondary/15 text-secondary border border-secondary/30'
                  : robotState === 'processing'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : robotState === 'success'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-surface-muted text-text-muted border border-border/60'
              }`}
            >
              {robotState === 'listening' && <span>🎙️ Listening...</span>}
              {robotState === 'speaking' && <span>🔊 Mascot Speaking...</span>}
              {robotState === 'processing' && <span>⚡ Executing Action...</span>}
              {robotState === 'success' && <span>✅ Action Confirmed!</span>}
              {robotState === 'idle' && <span>✨ Ready to assist</span>}
            </span>
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
          </div>

          <RobotAvatar
            className="scale-85 -my-2"
            isMouthMoving={isMouthMoving}
            language={language}
            state={robotState}
          />
          <VoiceWaveform
            barCount={14}
            isActive={robotState === 'speaking' || robotState === 'listening'}
            state={robotState}
          />

          {/* Pending Action Progress Capsule */}
          {pendingAction && (
            <div className="mt-1 flex items-center justify-between w-full max-w-sm rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-900 shadow-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-700 animate-spin" />
                <span>
                  {pendingAction.type === 'SLOT_FILLING_PROFILE'
                    ? 'Updating Artisan Profile...'
                    : pendingAction.type === 'PROFILE_CREATION_SESSION'
                    ? 'Creating Artisan Profile...'
                    : 'Awaiting your voice confirmation'}
                </span>
              </span>
              <button
                type="button"
                onClick={handleCancelAction}
                className="text-[0.65rem] font-bold text-red-600 hover:text-red-800 underline ml-2"
              >
                {language === 'pa' ? 'ਰੱਦ ਕਰੋ (Cancel)' : 'Cancel'}
              </button>
            </div>
          )}
        </div>

<<<<<<< HEAD
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
=======
        {/* 3. Conversation Message History */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 sm:px-6">
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
<<<<<<< HEAD
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
=======
              {/* Message Script & Role Header */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[0.65rem] text-text-muted">
                <span>{msg.sender === 'user' ? 'You (ਦਸਤਕਾਰ)' : 'Mascot AI'}</span>
                {msg.detectedLang && (
                  <span className="rounded-xs bg-surface-muted px-1 py-0.2 border border-border text-[0.6rem] font-bold uppercase">
                    {msg.detectedLang === 'pa' ? 'ਗੁਰਮੁਖੀ' : msg.detectedLang === 'hi' ? 'देवनागरी' : 'English'}
                  </span>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-primary text-white rounded-br-xs'
                    : msg.isError
                    ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-xs'
                    : 'bg-surface-muted text-text-main border border-border/80 rounded-bl-xs'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>

              {/* Assistant Message Actions: Copy & Replay */}
              {msg.sender === 'assistant' && (
                <div className="mt-1 flex items-center gap-2 px-1 text-text-muted text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="hover:text-text-main flex items-center gap-1 transition"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span className="text-[0.65rem]">{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => speakResponse(msg.speechText || msg.text, msg.detectedLang || language)}
                    className="hover:text-primary flex items-center gap-1 transition"
                    title="Replay voice audio"
                  >
                    <Volume2 className="h-3 w-3 text-secondary" />
                    <span className="text-[0.65rem]">Listen again</span>
                  </button>
                </div>
              )}

              {/* Action Data Visual Cards: Profile, Completion, Products, Orders */}
              {msg.actionData && (
                <div className="mt-2.5 w-full max-w-[95%] space-y-2">
                  {/* ARTISAN PROFILE STATUS CARD */}
                  {(msg.actionData.profileCard || msg.actionData.profile || msg.actionData.user) && (
                    <div className="rounded-xl border border-secondary/30 bg-gradient-to-br from-secondary/5 via-white to-primary/5 p-3.5 space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-white">
                            <UserCheck className="h-4 w-4" />
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-text-main">
                              {(msg.actionData.profile || msg.actionData.user)?.name || 'Artisan Profile'}
                            </h4>
                            <p className="text-[0.65rem] text-text-muted">
                              {(msg.actionData.profile || msg.actionData.user)?.city || 'Location not set'}
                            </p>
                          </div>
                        </div>

                        {msg.actionData.completion && (
                          <div className="text-right">
                            <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[0.68rem] font-bold">
                              {msg.actionData.completion.completionPercentage}% Complete
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Profile Completion Progress Bar */}
                      {msg.actionData.completion && (
                        <div className="space-y-1">
                          <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
                              style={{ width: `${msg.actionData.completion.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Crafts & Skills Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {((msg.actionData.profile || msg.actionData.user)?.skills || [
                          (msg.actionData.profile || msg.actionData.user)?.artCategory,
                        ])
                          .filter(Boolean)
                          .map((skill, idx) => (
                            <span
                              key={idx}
                              className="rounded-full bg-white border border-secondary/30 px-2 py-0.5 text-[0.68rem] font-semibold text-secondary shadow-2xs"
                            >
                              ✂️ {skill}
                            </span>
                          ))}

                        {(msg.actionData.profile || msg.actionData.user)?.experience && (
                          <span className="rounded-full bg-white border border-primary/30 px-2 py-0.5 text-[0.68rem] font-semibold text-primary shadow-2xs">
                            ⏳ {(msg.actionData.profile || msg.actionData.user).experience}
                          </span>
                        )}

                        {(msg.actionData.profile || msg.actionData.user)?.phone && (
                          <span className="rounded-full bg-white border border-border px-2 py-0.5 text-[0.68rem] text-text-secondary shadow-2xs">
                            📞 {(msg.actionData.profile || msg.actionData.user).phone}
                          </span>
                        )}
                      </div>

                      {/* Missing Fields Warning if any */}
                      {msg.actionData.completion?.missingFields?.length > 0 && (
                        <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-2 text-[0.68rem] text-amber-900">
                          <span className="font-bold">Next missing field: </span>
                          <span>
                            {msg.actionData.completion.nextMissingField?.label[language] ||
                              msg.actionData.completion.nextMissingField?.label.en}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Products Card List */}
                  {msg.actionData.products && msg.actionData.products.length > 0 && (
                    <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-3 space-y-2">
                      <p className="text-xs font-bold text-secondary flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" />
                        <span>Listed Crafts ({msg.actionData.products.length})</span>
                      </p>
                      <div className="grid gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {msg.actionData.products.map((p) => (
                          <div
                            key={p.id || p._id}
                            className="flex items-center justify-between rounded-lg bg-white p-2 text-xs border border-border shadow-2xs"
                          >
                            <span className="font-semibold text-text-main truncate max-w-[150px]">
                              {p.title}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-secondary">₹{p.price}</span>
                              <span className="text-[0.65rem] text-text-muted">Stock: {p.stock}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orders Card List */}
                  {msg.actionData.orders && msg.actionData.orders.length > 0 && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3 space-y-2">
                      <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Orders Overview ({msg.actionData.orders.length})</span>
                      </p>
                      <div className="grid gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {msg.actionData.orders.map((o) => (
                          <div
                            key={o.id || o._id}
                            className="flex items-center justify-between rounded-lg bg-white p-2.5 text-xs border border-amber-200 shadow-2xs"
                          >
                            <div>
                              <p className="font-bold text-text-main">
                                #{o.orderNumber || (o.id || o._id).slice(-6)}
                              </p>
                              <p className="text-[0.68rem] text-text-muted truncate max-w-[140px]">
                                {o.items?.[0]?.title || o.items?.[0]?.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-primary">₹{o.subtotal || o.totalAmount}</span>
                              <span
                                className={`block text-[0.65rem] font-bold ${
                                  o.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'
                                }`}
                              >
                                {o.status || o.orderStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Earnings Card */}
                  {msg.actionData.stats && (
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-emerald-300 bg-emerald-50/50 p-3">
                      <div>
                        <p className="text-[0.65rem] text-emerald-800 font-semibold uppercase">Total Earned</p>
                        <p className="text-sm font-bold text-emerald-700">₹{msg.actionData.stats.totalEarnings?.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-[0.65rem] text-amber-800 font-semibold uppercase">Pending Payout</p>
                        <p className="text-sm font-bold text-amber-700">₹{msg.actionData.stats.pendingPayout?.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  )}

                  {/* Navigation Action */}
                  {msg.actionData.navigation && (
                    <button
                      type="button"
                      onClick={() => {
                        stopAudio()
                        onClose()
                        if (msg.actionData.navigation.openAuth && openAuth) {
                          openAuth(msg.actionData.navigation.openAuth)
                        } else if (msg.actionData.navigation.path) {
                          navigate(msg.actionData.navigation.path)
                        }
                      }}
                      className="w-full flex items-center justify-between rounded-xl bg-gradient-to-r from-primary to-primary-hover p-2.5 text-xs font-bold text-white shadow-xs transition hover:brightness-105"
                    >
                      <span>{msg.actionData.navigation.label}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
                </div>
              )}
            </div>
          ))}

<<<<<<< HEAD
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
=======
          {/* Live recognition feedback while artisan is speaking */}
          {liveTranscript && (
            <div className="flex flex-col items-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-xs bg-primary/20 border border-primary/40 px-3.5 py-2 text-xs italic text-primary animate-pulse">
                <span>🎙️ "{liveTranscript}"</span>
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
              </div>
            </div>
          )}

<<<<<<< HEAD
          {/* Mic error warning */}
=======
          {/* Microphone Permission Warning */}
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
          {micError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

<<<<<<< HEAD
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
=======
        {/* 4. Quick Artisan Suggestion Chips */}
        <div className="border-t border-border/60 bg-surface-muted/30 px-3 py-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.command)}
                className="rounded-full bg-surface border border-border px-2.5 py-1 text-[0.7rem] font-semibold text-text-secondary hover:text-text-main hover:border-secondary transition shadow-2xs"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638

        {/* 5. Audio Controls & Speech Input Bar */}
        <div className="border-t border-border bg-surface px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            {/* Repeat Last Question Button */}
            <button
<<<<<<< HEAD
              aria-label="Replay speech"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-muted text-text-secondary hover:text-primary hover:border-primary transition cursor-pointer"
              onClick={() => {
                if (lastSpokenText) speakResponse(lastSpokenText)
              }}
              title="Replay speech"
=======
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
              type="button"
              onClick={handleRepeatLast}
              disabled={!lastSpokenText}
              title={language === 'pa' ? 'ਦੁਬਾਰਾ ਸੁਣੋ (Repeat)' : 'Repeat last answer'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted hover:text-text-main hover:border-secondary transition disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Big Tactile Microphone Button */}
            <button
              aria-label={robotState === 'listening' ? 'Stop listening' : 'Start voice recording'}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-md transition-all duration-300 ${
                robotState === 'listening'
                  ? 'bg-red-600 text-white ring-4 ring-red-300 scale-105'
                  : 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 active:scale-95'
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
                <>
                  <span className="absolute -inset-1 rounded-2xl bg-red-500/40 animate-ping" />
                  <Mic className="h-5 w-5 animate-pulse relative z-10" />
                </>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            {/* Optional Text Input for noisy environments */}
            <div className="relative flex-1">
              <input
                className="w-full rounded-xl border border-border bg-surface-muted/50 px-3.5 py-2.5 pr-10 text-xs text-text-main placeholder:text-text-muted outline-none transition focus:border-secondary focus:bg-white focus:ring-2 focus:ring-secondary/20"
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage()
                }}
                placeholder={
                  language === 'pa'
                    ? 'ਬੋਲੋ ਜਾਂ ਇੱਥੇ ਲਿਖੋ (ਜਿਵੇਂ: ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ ਦਿਖਾਓ)...'
                    : language === 'hi'
                    ? 'बोलें या लिखें (जैसे: मेरी प्रोफाइल दिखाओ)...'
                    : 'Speak or type (e.g. I am a tailor with 5 yrs exp)...'
                }
                type="text"
                value={inputMessage}
              />
              <button
                aria-label="Send message"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-hover transition disabled:opacity-40"
                disabled={!inputMessage.trim()}
                onClick={() => handleSendMessage()}
                type="button"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
<<<<<<< HEAD

          <p className="text-center text-[10px] font-semibold text-text-muted">
            {robotState === 'listening'
              ? language === 'pa'
                ? 'ਬੋਲੋ ਜੀ... ਮੈਂ ਸੁਣ ਰਿਹਾ ਹਾਂ'
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
=======
>>>>>>> 6452efc9454e86d710347595625a1ab9335b5638
        </div>
      </div>
    </div>
  )
}

export default ArtisanVoiceAssistantDrawer
