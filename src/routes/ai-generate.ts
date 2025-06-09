import express from 'express';
import { generate_Text } from "../control/ai-generate/ai-generate";
import { generate_Image, regenerate_Image } from "../control/ai-generate/image-generate/image-generate";
import { generate_Video } from "../control/ai-generate/video-generate/video-generate";
import { generate_Voice } from "../control/ai-generate/voice-generate/voice-generate";
const router = express.Router();
router.post("/generate-text", generate_Text);
router.post("/generate-image", generate_Image);
router.post ("/regenerate-image", regenerate_Image);
router.post("/generate-video", generate_Video);
router.post("/generate-voice", generate_Voice);

export default router;