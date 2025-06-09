import { Request, Response } from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// Text-to-Speech function with text, voicetype, and speed
export const generate_Voice = async (req: Request, res: Response) => {
  const { text, voicetype = "alloy", speed = 1.0 } = req.body;

  // Validate required fields
  if (!text) {
     res.status(400).json({
      success: false,
      error: "Text is required",
    });
  }

  // Validate voicetype
  const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  if (!validVoices.includes(voicetype)) {
     res.status(400).json({
      success: false,
      error: `Invalid voice type. Valid options: ${validVoices.join(", ")}`,
    });
  }

  // Validate speed (OpenAI accepts 0.25 to 4.0)
  if (speed < 0.25 || speed > 4.0) {
     res.status(400).json({
      success: false,
      error: "Speed must be between 0.25 and 4.0",
    });
  }

  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `voice_${Date.now()}.mp3`;
    const speechFile = path.join(tempDir, filename);

    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voicetype as
        | "alloy"
        | "echo"
        | "fable"
        | "onyx"
        | "nova"
        | "shimmer",
      input: text,
      speed: speed,
    });

    // Convert response to buffer and save to file
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);

    res.status(200).json({
      success: true,
      message: "Voice generated successfully",
      audioFile: `/temp/${filename}`,
      audioPath: speechFile,
      settings: {
        text: text,
        voicetype: voicetype,
        speed: speed,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: "Failed to generate voice",
    });
  }
};

// Enhanced function with HD quality option
export const voice_Generate_HD = async (req: Request, res: Response) => {
  const {
    text,
    voicetype = "alloy",
    speed = 1.0,
    quality = "standard",
  } = req.body;

  // Validate required fields
  if (!text) {
    return res.status(400).json({
      success: false,
      error: "Text is required",
    });
  }

  // Validate voicetype
  const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  if (!validVoices.includes(voicetype)) {
    return res.status(400).json({
      success: false,
      error: `Invalid voice type. Valid options: ${validVoices.join(", ")}`,
    });
  }

  // Validate speed
  if (speed < 0.25 || speed > 4.0) {
    return res.status(400).json({
      success: false,
      error: "Speed must be between 0.25 and 4.0",
    });
  }

  // Validate quality
  const validQualities = ["standard", "hd"];
  if (!validQualities.includes(quality)) {
    return res.status(400).json({
      success: false,
      error: `Invalid quality. Valid options: ${validQualities.join(", ")}`,
    });
  }

  try {
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `voice_${quality}_${Date.now()}.mp3`;
    const speechFile = path.join(tempDir, filename);

    // Choose model based on quality
    const model = quality === "hd" ? "tts-1-hd" : "tts-1";

    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: model,
      voice: voicetype as
        | "alloy"
        | "echo"
        | "fable"
        | "onyx"
        | "nova"
        | "shimmer",
      input: text,
      speed: speed,
    });

    // Convert response to buffer and save to file
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);

    res.status(200).json({
      success: true,
      message: "Voice generated successfully",
      audioFile: `/temp/${filename}`,
      audioPath: speechFile,
      settings: {
        text: text,
        voicetype: voicetype,
        speed: speed,
        quality: quality,
        model: model,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: "Failed to generate voice",
    });
  }
};
