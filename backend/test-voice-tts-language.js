import assert from "node:assert/strict";
import { synthesizeVoiceAudio } from "./src/services/voice-tts.service.js";

async function runVoiceTtsLanguageTest() {
  const originalFetch = globalThis.fetch;
  const originalTtsKey = process.env.GEMINI_TTS_API_KEY;
  const requests = [];
  process.env.GEMINI_TTS_API_KEY = "test-key";
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        output_audio: { data: Buffer.from([1, 2, 3]).toString("base64") },
      }),
    };
  };

  try {
    for (const [language, voice] of [
      ["hi", "Puck"],
      ["pa", "Kore"],
    ]) {
      const audio = await synthesizeVoiceAudio("Test speech", language);
      assert.deepEqual([...audio], [1, 2, 3]);

      const payload = JSON.parse(requests.at(-1).options.body);
      assert.equal(payload.generation_config.speech_config[0].voice, voice);
      assert.equal(payload.response_format.type, "audio");
    }
    console.log("Hindi and Punjabi TTS voice selection passed.");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalTtsKey === undefined) {
      delete process.env.GEMINI_TTS_API_KEY;
    } else {
      process.env.GEMINI_TTS_API_KEY = originalTtsKey;
    }
  }
}

runVoiceTtsLanguageTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
