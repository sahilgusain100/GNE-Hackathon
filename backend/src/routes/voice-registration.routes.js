import { Router } from "express";
import {
  getVoiceQuestions,
  getVoiceQuestionAudioController,
  processVoiceAnswer,
  getVoiceSummary,
  registerArtisanVoice,
} from "../controllers/voice-registration.controller.js";
import {
  handleVoiceAssistantMessage,
  getVoiceArtisanProfileController,
  updateVoiceArtisanProfileController,
  manageVoiceArtisanSkillController,
  synthesizeVoiceAudioController,
  transcribeVoiceAudioController,
} from "../controllers/voice-assistant.controller.js";
import { optionalJWT, verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes for voice registration
router.get("/questions", getVoiceQuestions);
router.post("/question-audio", getVoiceQuestionAudioController);
router.post("/process-answer", processVoiceAnswer);
router.post("/summary", getVoiceSummary);
router.post("/register", registerArtisanVoice);

// Universal Mascot & Voice Assistant route (supports authenticated artisans as well as guests on login/signup)
router.post("/assistant", optionalJWT, handleVoiceAssistantMessage);

// Structured Artisan Profile Tools
router.get("/artisan-profile", verifyJWT, getVoiceArtisanProfileController);
router.post("/artisan-profile/update", verifyJWT, updateVoiceArtisanProfileController);
router.post("/artisan-profile/skill", verifyJWT, manageVoiceArtisanSkillController);

// Speech Synthesis & Recognition Services
router.post("/tts", synthesizeVoiceAudioController);
router.post("/stt", upload.single("audio"), transcribeVoiceAudioController);

export default router;
