import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Edit3,
  MapPin,
  Mic,
  Package,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  UserCheck,
  UserRound,
  Volume2,
  VolumeX,
  Wallet,
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
  { code: 'pa', name: 'ਪੰਜਾਬੀ', label: 'Punjabi', script: 'Gurmukhi', flag: '🇮🇳' },
  { code: 'hi', name: 'हिंदी', label: 'Hindi', script: 'Devanagari', flag: '🇮🇳' },
  { code: 'en', name: 'English', label: 'English', script: 'Latin', flag: '🇬🇧' },
]

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
    }
  }

  return {
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
  }
}

const ArtisanVoiceAssistantDrawer = ({ isOpen, onClose, user: propUser }) => {
  const [language, setLanguage] = useState('pa')
  const navigate = useNavigate()
  const location = useLocation()
  const { openAuth, currentUser, authenticate } = useAuthDialog()

  const activeUser = propUser || currentUser
  const pathname = location?.pathname || ''

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
  const [inputMessage, setInputMessage] = useState('')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [robotState, setRobotState] = useState('idle') // 'idle' | 'speaking' | 'listening' | 'processing' | 'success'
  const [isMouthMoving, setIsMouthMoving] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [lastSpokenText, setLastSpokenText] = useState('')
  const [micError, setMicError] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

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

      const voices = window.speechSynthesis.getVoices()
      let utteranceText = text
      let voiceLocale = LANGUAGE_LOCALES[targetLang] || 'pa-IN'
      let matchedVoice = null

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
      if (matchedVoice) utterance.voice = matchedVoice

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

      // Safety timeout
      const duration = Math.max(3000, text.length * 95)
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

        // Speak the reply out loud in the matching language
        speakResponse(res.speechText || res.reply, finalLang)
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
            detectedLang: language,
          },
        ])
        setRobotState('idle')
        speakResponse(errMsg, language)
      }
    },
    [inputMessage, messages, pendingAction, language, stopAudio, speakResponse, authenticate, robotState]
  )

  // Start Speech-to-Text Recognition with dynamic multilingual support
  const startListening = useCallback(() => {
    // Interrupt ongoing speech immediately
    stopAudio()
    setMicError('')
    setLiveTranscript('')

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setMicError(
        language === 'pa'
          ? 'ਬ੍ਰਾਉਜ਼ਰ ਸਪੀਚ ਰਿਕੋਗਨੀਸ਼ਨ ਦਾ ਸਮਰਥਨ ਨਹੀਂ ਕਰਦਾ। ਕਿਰਪਾ ਕਰਕੇ Google Chrome ਵਰਤੋ।'
          : language === 'hi'
          ? 'ब्राउज़र स्पीच रिकग्निशन समर्थित नहीं है। कृपया Google Chrome का उपयोग करें।'
          : 'Your browser does not support Speech Recognition. Please use Chrome.'
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
              : 'Please allow microphone access.'
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
  }, [activeUser, language])

  if (!isOpen) return null

  return (
    <div
      aria-label="SkillBridge Artisan Voice Assistant"
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn"
      role="dialog"
    >
      <div className="relative flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl border-l border-border transition-transform duration-300 sm:max-w-md md:max-w-lg">
        {/* 1. Header with dynamic language indicator */}
        <div className="flex items-center justify-between border-b border-border/80 bg-surface-muted/60 px-4 py-3 sm:px-6">
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

          <div className="flex items-center gap-2">
            {/* Multilingual Selector & Auto-detected Language Pill */}
            <div className="flex items-center gap-1 rounded-full bg-surface border border-border p-0.5 shadow-2xs">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`rounded-full px-2 py-0.5 text-[0.68rem] font-bold transition-all ${
                    language === l.code
                      ? 'bg-primary text-white shadow-xs scale-105'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
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
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-primary" />}
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

        {/* 3. Conversation Message History */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 sm:px-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
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
                </div>
              )}
            </div>
          ))}

          {/* Live recognition feedback while artisan is speaking */}
          {liveTranscript && (
            <div className="flex flex-col items-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-xs bg-primary/20 border border-primary/40 px-3.5 py-2 text-xs italic text-primary animate-pulse">
                <span>🎙️ "{liveTranscript}"</span>
              </div>
            </div>
          )}

          {/* Microphone Permission Warning */}
          {micError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

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

        {/* 5. Audio Controls & Speech Input Bar */}
        <div className="border-t border-border bg-surface px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            {/* Repeat Last Question Button */}
            <button
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
        </div>
      </div>
    </div>
  )
}

export default ArtisanVoiceAssistantDrawer
