import { ARTISAN_QUESTIONS } from "../utils/artisan-voice-questions.js";

const AUDIO_CACHE = new Map();
const GEMINI_TTS_MODEL = "gemini-3.8-flash-tts";

function getGeminiTtsKey() {
  return process.env.GEMINI_TTS_API_KEY || process.env.GEMINI_API_KEY || "";
}

/**
 * Request audio from Gemini TTS
 */
async function requestTtsAudio(text, language = "pa") {
  const provider = (process.env.TTS_PROVIDER || "gemini").toLowerCase();
  const apiKey = getGeminiTtsKey();
  if (!apiKey) {
    throw new Error("GEMINI_TTS_API_KEY is not configured");
  }

  const voiceName = language === "hi" ? "Puck" : language === "pa" ? "Kore" : "Aoede";

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: GEMINI_TTS_MODEL,
      input: [
        {
          type: "user_input",
          content: [
            {
              type: "text",
              text,
              annotations: [
                {
                  type: "speech_metadata",
                  style: "warm, friendly, and natural",
                },
              ],
            },
          ],
        },
      ],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice: voiceName }] },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini TTS request failed with status ${response.status}`);
  }

  const interaction = await response.json();
  const audioData =
    interaction?.output_audio?.data ||
    interaction?.steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content || [])
      .find((part) => part.type === "audio")?.data;

  if (!audioData) {
    throw new Error("Gemini TTS returned no audio data");
  }

  return Buffer.from(audioData, "base64");
}

export function getVoiceQuestionAudio(questionId, language) {
  const cacheKey = `q:${questionId}:${language}`;
  if (!AUDIO_CACHE.has(cacheKey)) {
    const question = ARTISAN_QUESTIONS.find((item) => item.id === questionId);
    const text = question?.prompts[language]?.spoken;
    if (!text) {
      throw new Error("Question speech is not available in the requested language");
    }

    const audioPromise = requestTtsAudio(text, language).catch((error) => {
      AUDIO_CACHE.delete(cacheKey);
      throw error;
    });
    AUDIO_CACHE.set(cacheKey, audioPromise);
  }
  return AUDIO_CACHE.get(cacheKey);
}

export async function synthesizeVoiceAudio(text, language = "pa") {
  if (!text || !text.trim()) {
    throw new Error("Text is required for TTS synthesis.");
  }
  return await requestTtsAudio(text.trim(), language);
}
