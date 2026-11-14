import fs from "fs";

/**
 * Transcribe spoken audio file using Groq Whisper (whisper-large-v3)
 * Supports Punjabi (pa), Hindi (hi), and English (en)
 */
export async function transcribeAudioFile(filePath, language = "") {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error("GROQ_API_KEY is not configured for Whisper STT.");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error("Audio file not found on disk.");
  }

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(filePath)]);
  formData.append("file", fileBlob, "audio.wav");
  formData.append("model", "whisper-large-v3");

  if (language && ["pa", "hi", "en"].includes(language)) {
    formData.append("language", language);
  }

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq Whisper STT failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    success: true,
    text: data.text || "",
    detectedLanguage: language || "en",
  };
}
