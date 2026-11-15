import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { transcribeAudioFile } from "./src/services/voice-stt.service.js";

async function runVoiceSttFormatTest() {
  const originalFetch = globalThis.fetch;
  const originalGroqKey = process.env.GROQ_API_KEY;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skillbridge-stt-"));
  const audioPath = path.join(tempDir, "voice.webm");
  fs.writeFileSync(audioPath, Buffer.from([1, 2, 3]));
  process.env.GROQ_API_KEY = "test-key";

  globalThis.fetch = async (_url, options) => {
    const formData = options.body;
    const audio = formData.get("file");
    assert.equal(audio.name, "audio.webm");
    assert.equal(audio.type, "audio/webm");
    assert.equal(formData.get("language"), "pa");
    return {
      ok: true,
      json: async () => ({ text: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ" }),
    };
  };

  try {
    const result = await transcribeAudioFile(audioPath, "pa");
    assert.deepEqual(result, {
      success: true,
      text: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ",
      detectedLanguage: "pa",
    });
    console.log("Punjabi WebM audio format and language passed.");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGroqKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalGroqKey;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runVoiceSttFormatTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
