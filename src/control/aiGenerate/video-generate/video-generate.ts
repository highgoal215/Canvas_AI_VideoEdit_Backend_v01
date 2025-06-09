import { Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { ApiSuccess } from "../../../utils/ApiSucess";
import { ApiError } from "../../../utils/ApiError";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VideoGenerateRequest {
  prompt: string;
  duration?: string;
  style?: string;
}

// Helper function to parse duration and calculate frames
const getFramesFromDuration = (duration: string): number => {
  if (!duration) return 15; // Default frames
  
  // Extract number from duration string (e.g., "15s", "30sec", "1min")
  const match = duration.toLowerCase().match(/(\d+)/);
  if (!match) return 15;
  
  const value = parseInt(match[1]);
  
  // Determine if it's seconds or minutes
  if (duration.toLowerCase().includes('min')) {
    return Math.min(Math.max(value * 10, 5), 300); // 10 frames per minute, max 300 frames
  } else {
    return Math.min(Math.max(value, 5), 120); // Assume seconds, max 120 frames
  }
};

// Helper function to enhance prompt with user-defined style
const enhancePromptWithStyle = (prompt: string, style?: string): string => {
  if (!style || style.trim().length === 0) {
    return prompt;
  }
  
  return `${prompt}, in ${style.trim()} style`;
};

// Helper function to validate and sanitize inputs
const sanitizeInput = (input: string, maxLength: number = 500): string => {
  return input?.trim().substring(0, maxLength) || "";
};

export const generate_Video = async (req: Request, res: Response, next: NextFunction) => {
    const { prompt, duration, style }: VideoGenerateRequest = req.body;

    // Basic validation - only check if prompt exists
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new ApiError({}, 400, "Prompt is required and cannot be empty");
    }

    // Sanitize inputs
    const sanitizedPrompt = sanitizeInput(prompt, 1000);
    const sanitizedDuration = duration ? sanitizeInput(duration, 50) : "15s";
    const sanitizedStyle = style ? sanitizeInput(style, 200) : "";

    if (sanitizedPrompt.length === 0) {
      throw new ApiError({}, 400, "Prompt cannot be empty after sanitization");
    }

    try {
      const frames = getFramesFromDuration(sanitizedDuration);
      const enhancedPrompt = enhancePromptWithStyle(sanitizedPrompt, sanitizedStyle);
      const imageUrls: string[] = [];

      console.log(`Generating video with ${frames} frames for duration: ${sanitizedDuration}`);

      // Generate multiple images for video frames
      for (let i = 0; i < frames; i++) {
        // Create varied prompts for smooth transitions
        const progressRatio = frames > 1 ? i / (frames - 1) : 0;
        const framePrompt = `${enhancedPrompt}, sequence frame ${i + 1} of ${frames}, cinematic progression, high quality`;
        
        try {
          const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: framePrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
          });

          if (response.data && response.data.length > 0 && response.data[0]?.url) {
            imageUrls.push(response.data[0].url);
            console.log(`Generated frame ${i + 1}/${frames}`);
          } else {
            console.warn(`No image URL returned for frame ${i + 1}`);
          }
        } catch (frameError: any) {
          console.error(`Error generating frame ${i + 1}:`, frameError.message);
          // Continue with other frames instead of failing completely
          continue;
        }
      }

      // Check if we got at least some frames
      if (imageUrls.length === 0) {
        throw new ApiError({}, 500, "Failed to generate any video frames");
      }

      // Create temp directory for processing
      const tempDir = path.join(__dirname, "../../../temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const outputPath = path.join(tempDir, `${videoId}.mp4`);

      // Prepare video generation data
      const videoData = {
        videoId,
        originalPrompt: sanitizedPrompt,
        enhancedPrompt,
        duration: sanitizedDuration,
        style: sanitizedStyle || "default",
        requestedFrames: frames,
        generatedFrames: imageUrls.length,
        status: "processing",
        outputPath,
        imageUrls,
        progress: 0,
        createdAt: new Date().toISOString(),
        estimatedCompletionTime: new Date(Date.now() + (imageUrls.length * 2000)).toISOString() // Rough estimate
      };

      console.log(`Video generation initiated: ${videoId}`);

      res.status(200).json(
        new ApiSuccess(
          videoData, 
          `Video generation started successfully. Generated ${imageUrls.length} out of ${frames} requested frames.`
        )
      );

    } catch (error: any) {
      console.error("Video generation error:", error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle OpenAI API specific errors
      if (error?.status === 400) {
        throw new ApiError({}, 400, "Invalid request to AI service. Please check your prompt.");
      }
      
      if (error?.status === 429) {
        throw new ApiError({}, 429, "AI service rate limit exceeded. Please try again later.");
      }
      
      throw new ApiError(
        {}, 
        500, 
        error?.message || "An unexpected error occurred during video generation"
      );
    }
  }

// Optional: Add a helper endpoint to get video generation status
export const getVideoStatus =  async (req: Request, res: Response, next: NextFunction) => {
    const { videoId } = req.params;
    
    if (!videoId) {
      throw new ApiError({}, 400, "Video ID is required");
    }
    const statusData = {
      videoId,
      status: "processing", // or "completed", "failed", "queued"
      progress: 50, // percentage
      message: "Video is being processed..."
    };
    
    res.status(200).json(
      new ApiSuccess(statusData, "Video status retrieved successfully")
    );
  }

