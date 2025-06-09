import express from 'express';
import { generate_Text } from "../control/aiGenerate/ai-generate";
import { generate_Image, regenerate_Image } from "../control/aiGenerate/image-generate/image-generate";
import { generate_Video } from "../control/aiGenerate/video-generate/video-generate";
import { generate_Voice } from "../control/aiGenerate/voice-generate/voice-generate";
import { authenticateToken } from '../middleware/auth-middleware';
const router = express.Router();
router.post("/generate-text",authenticateToken, generate_Text);
router.post("/generate-image",authenticateToken, generate_Image);
router.post ("/regenerate-image", regenerate_Image);
router.post("/generate-video", generate_Video);
router.post("/generate-voice", generate_Voice);

export default router;