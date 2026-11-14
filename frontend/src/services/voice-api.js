import { API_BASE_URL, apiRequest, setAuthToken } from './auth-api'
import { saveSessionUser } from '../utils/user-storage'

/**
 * Fetch voice registration questions & system messages
 */
export async function getVoiceQuestionsApi(lang = 'pa') {
  return await apiRequest(`/voice/questions?lang=${encodeURIComponent(lang)}`, {
    method: 'GET',
  })
}

/**
 * Fetch generated audio for a predefined registration question.
 */
export async function getVoiceQuestionAudioApi({ question_id, language = 'pa' }) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/voice/question-audio`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id, language }),
    })
  } catch (error) {
    console.error('Network error when requesting question audio:', error)
    throw new Error('Unable to connect to the voice service.')
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.message || `Question audio failed (${response.status}).`)
  }

  return response.blob()
}

/**
 * Send spoken transcript and question ID to backend for LLM extraction
 */
export async function processVoiceAnswerApi({
  question_id,
  transcript,
  language = 'pa',
  current_answers = {},
}) {
  return await apiRequest('/voice/process-answer', {
    method: 'POST',
    body: JSON.stringify({
      question_id,
      transcript,
      language,
      current_answers,
    }),
  })
}

/**
 * Request spoken profile summary text in chosen language
 */
export async function getVoiceSummaryApi({ answers = {}, language = 'pa' }) {
  return await apiRequest('/voice/summary', {
    method: 'POST',
    body: JSON.stringify({ answers, language }),
  })
}

/**
 * Complete voice registration and authenticate artisan
 */
export async function registerArtisanVoiceApi({ answers = {}, language = 'pa' }) {
  const result = await apiRequest('/voice/register', {
    method: 'POST',
    body: JSON.stringify({ answers, language }),
  })

  if (result?.token) {
    setAuthToken(result.token)
  }
  if (result?.user) {
    saveSessionUser(result.user)
  }

  return result
}

/**
 * Send natural voice command to Artisan AI Assistant (Profile, Products, Orders, Payments, Industry)
 */
export async function sendVoiceAssistantMessageApi({
  message,
  conversationHistory = [],
  pendingAction = null,
  language = 'pa',
}) {
  return await apiRequest('/voice/assistant', {
    method: 'POST',
    body: JSON.stringify({
      message,
      conversationHistory,
      pendingAction,
      language,
    }),
  })
}

/**
 * Retrieve artisan profile & completion diagnostic
 */
export async function getVoiceArtisanProfileApi() {
  return await apiRequest('/voice/artisan-profile', {
    method: 'GET',
  })
}

/**
 * Update artisan profile via voice tool
 */
export async function updateVoiceArtisanProfileApi(updates) {
  return await apiRequest('/voice/artisan-profile/update', {
    method: 'POST',
    body: JSON.stringify(updates),
  })
}

/**
 * Add or remove artisan skill via voice tool
 */
export async function manageVoiceArtisanSkillApi(action, skill) {
  return await apiRequest('/voice/artisan-profile/skill', {
    method: 'POST',
    body: JSON.stringify({ action, skill }),
  })
}

/**
 * Synthesize speech audio from text
 */
export async function synthesizeVoiceAudioApi(text, language = 'pa') {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/voice/tts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    })
  } catch (error) {
    throw new Error('TTS service connection failed.')
  }
  if (!response.ok) {
    throw new Error(`TTS synthesis failed with status ${response.status}`)
  }
  return response.blob()
}

/**
 * Transcribe spoken audio file via backend Whisper STT
 */
export async function transcribeVoiceAudioApi(audioBlob, language = '') {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'voice.wav')
  if (language) formData.append('language', language)

  let response
  try {
    response = await fetch(`${API_BASE_URL}/voice/stt`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
  } catch (error) {
    throw new Error('Whisper STT service connection failed.')
  }

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.message || 'Speech-to-text failed.')
  }
  return await response.json()
}

