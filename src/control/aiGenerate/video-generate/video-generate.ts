import { Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { ApiSuccess } from "../../../utils/ApiSucess";
import { ApiError } from "../../../utils/ApiError";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add validation for API key
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not configured");
  throw new Error("OpenAI API key is not configured");
}

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
  if (duration.toLowerCase().includes("min")) {
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

export const generate_Video = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { prompt, duration, style }: VideoGenerateRequest = req.body;

  // Basic validation - only check if prompt exists
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
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
    const enhancedPrompt = enhancePromptWithStyle(
      sanitizedPrompt,
      sanitizedStyle
    );
    const imageUrls: string[] = [];

    console.log(
      `Generating video with ${frames} frames for duration: ${sanitizedDuration}`
    );

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

        if (
          response.data &&
          response.data.length > 0 &&
          response.data[0]?.url
        ) {
          imageUrls.push(response.data[0].url);
          console.log(`Generated frame ${i + 1}/${frames}`);
        } else {
          console.warn(`No image URL returned for frame ${i + 1}`);
        }
      } catch (frameError: any) {
        console.error(`Error generating frame ${i + 1}:`, {
          message: frameError.message,
          type: frameError.type,
          code: frameError.code,
          status: frameError.status,
          details: frameError.response?.data
        });
        
        // Add specific error handling for common DALL-E errors
        if (frameError.type === 'invalid_request_error') {
          console.error('Invalid request to DALL-E:', frameError.message);
        } else if (frameError.type === 'authentication_error') {
          throw new ApiError({}, 401, "OpenAI API authentication failed. Please check your API key.");
        } else if (frameError.type === 'rate_limit_error') {
          throw new ApiError({}, 429, "OpenAI API rate limit exceeded. Please try again later.");
        }
        
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
      estimatedCompletionTime: new Date(
        Date.now() + imageUrls.length * 2000
      ).toISOString(), // Rough estimate
    };

    console.log(`Video generation initiated: ${videoId}`);

    res
      .status(200)
      .json(
        new ApiSuccess(
          videoData,
          `Video generation started successfully. Generated ${imageUrls.length} out of ${frames} requested frames.`
        )
      );
  } catch (error: any) {
    console.error("Video generation error:", {
      message: error.message,
      type: error.type,
      code: error.code,
      status: error.status,
      details: error.response?.data
    });

    if (error instanceof ApiError) {
      throw error;
    }

    // Handle OpenAI API specific errors
    if (error?.status === 400) {
      throw new ApiError(
        {},
        400,
        `Invalid request to AI service: ${error.message || 'Please check your prompt.'}`
      );
    }

    if (error?.status === 401) {
      throw new ApiError(
        {},
        401,
        "OpenAI API authentication failed. Please check your API key."
      );
    }

    if (error?.status === 429) {
      throw new ApiError(
        {},
        429,
        "AI service rate limit exceeded. Please try again later."
      );
    }

    throw new ApiError(
      {},
      500,
      `An unexpected error occurred during video generation: ${error.message || 'Unknown error'}`
    );
  }
};

// Optional: Add a helper endpoint to get video generation status
export const getVideoStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError({}, 400, "Video ID is required");
  }
  const statusData = {
    videoId,
    status: "processing", // or "completed", "failed", "queued"
    progress: 50, // percentage
    message: "Video is being processed...",
  };

  res
    .status(200)
    .json(new ApiSuccess(statusData, "Video status retrieved successfully"));
};

// import { Request, Response, NextFunction } from "express";
// import axios from "axios";
// import fs from "fs";
// import path from "path";
// import { ApiSuccess } from "../../../utils/ApiSucess";
// import { ApiError } from "../../../utils/ApiError";

// interface VideoGenerateRequest {
//   prompt: string;
//   duration?: string;
//   style?: string;
// }

// interface VeedVideoResponse {
//   id: string;
//   status: string;
//   download_url?: string;
//   progress?: number;
//   error?: string;
// }

// // Helper function to parse duration and convert to seconds
// const getDurationInSeconds = (duration: string): number => {
//   if (!duration) return 15; // Default 15 seconds

//   const match = duration.toLowerCase().match(/(\d+)/);
//   if (!match) return 15;

//   const value = parseInt(match[1]);

//   if (duration.toLowerCase().includes("min")) {
//     return Math.min(Math.max(value * 60, 5), 300); // Convert minutes to seconds, max 5 minutes
//   } else {
//     return Math.min(Math.max(value, 5), 120); // Assume seconds, max 2 minutes
//   }
// };

// // Helper function to enhance prompt with style
// const enhancePromptWithStyle = (prompt: string, style?: string): string => {
//   if (!style || style.trim().length === 0) {
//     return prompt;
//   }

//   return `${prompt}, in ${style.trim()} style`;
// };

// // Helper function to validate and sanitize inputs
// const sanitizeInput = (input: string, maxLength: number = 500): string => {
//   return input?.trim().substring(0, maxLength) || "";
// };

// // Function to create video using Veed.io API
// const createVideoWithVeed = async (
//   prompt: string,
//   duration: number,
//   style?: string
// ) => {
//   const veedApiKey = process.env.VEED_API_KEY;
//   const veedApiUrl = process.env.VEED_API_URL || "https://api.veed.io/v1";

//   if (!veedApiKey) {
//     throw new Error("VEED_API_KEY is not configured");
//   }

//   const enhancedPrompt = enhancePromptWithStyle(prompt, style);

//   try {
//     // Create video generation request
//     const response = await axios.post(
//       `${veedApiUrl}/videos/generate`,
//       {
//         prompt: enhancedPrompt,
//         duration: duration,
//         quality: "hd", // or 'sd', '4k' depending on your plan
//         aspect_ratio: "16:9", // or '9:16', '1:1'
//         style: style || "realistic",
//         fps: 30,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${veedApiKey}`,
//           "Content-Type": "application/json",
//         },
//         timeout: 30000, // 30 seconds timeout
//       }
//     );

//     return response.data;
//   } catch (error: any) {
//     console.error("Veed.io API Error:", error.response?.data || error.message);
//     throw error;
//   }
// };

// // Function to check video generation status
// const checkVideoStatus = async (
//   videoId: string
// ): Promise<VeedVideoResponse> => {
//   const veedApiKey = process.env.VEED_API_KEY;
//   const veedApiUrl = process.env.VEED_API_URL || "https://api.veed.io/v1";

//   try {
//     const response = await axios.get(`${veedApiUrl}/videos/${videoId}`, {
//       headers: {
//         Authorization: `Bearer ${veedApiKey}`,
//         "Content-Type": "application/json",
//       },
//     });

//     return response.data;
//   } catch (error: any) {
//     console.error(
//       "Error checking video status:",
//       error.response?.data || error.message
//     );
//     throw error;
//   }
// };

// export const generate_Video = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { prompt, duration, style }: VideoGenerateRequest = req.body;

//     // Basic validation
//     if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
//       throw new ApiError({}, 400, "Prompt is required and cannot be empty");
//     }

//     // Sanitize inputs
//     const sanitizedPrompt = sanitizeInput(prompt, 1000);
//     const sanitizedDuration = duration ? sanitizeInput(duration, 50) : "15s";
//     const sanitizedStyle = style ? sanitizeInput(style, 200) : "";

//     if (sanitizedPrompt.length === 0) {
//       throw new ApiError({}, 400, "Prompt cannot be empty after sanitization");
//     }

//     const durationInSeconds = getDurationInSeconds(sanitizedDuration);

//     console.log(
//       `Generating video with Veed.io - Duration: ${durationInSeconds}s, Style: ${sanitizedStyle || "default"}`
//     );

//     // Create video with Veed.io
//     const veedResponse = await createVideoWithVeed(
//       sanitizedPrompt,
//       durationInSeconds,
//       sanitizedStyle
//     );

//     // Prepare response data
//     const videoData = {
//       videoId:
//         veedResponse.id ||
//         `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
//       originalPrompt: sanitizedPrompt,
//       enhancedPrompt: enhancePromptWithStyle(sanitizedPrompt, sanitizedStyle),
//       duration: sanitizedDuration,
//       durationSeconds: durationInSeconds,
//       style: sanitizedStyle || "default",
//       status: veedResponse.status || "processing",
//       progress: veedResponse.progress || 0,
//       downloadUrl: veedResponse.download_url || null,
//       createdAt: new Date().toISOString(),
//       estimatedCompletionTime: new Date(
//         Date.now() + durationInSeconds * 10000
//       ).toISOString(), // Rough estimate
//       provider: "veed.io",
//     };

//     console.log(
//       `Video generation initiated with Veed.io: ${videoData.videoId}`
//     );

//     res
//       .status(200)
//       .json(
//         new ApiSuccess(
//           videoData,
//           `Video generation started successfully with Veed.io. Video ID: ${videoData.videoId}`
//         )
//       );
//   } catch (error: any) {
//     console.error("Video generation error:", error);

//     if (error instanceof ApiError) {
//       throw error;
//     }

//     // Handle Veed.io API specific errors
//     if (error?.response?.status === 400) {
//       throw new ApiError(
//         {},
//         400,
//         "Invalid request to Veed.io API. Please check your prompt and parameters."
//       );
//     }

//     if (error?.response?.status === 401) {
//       throw new ApiError(
//         {},
//         401,
//         "Veed.io API authentication failed. Please check your API key."
//       );
//     }

//     if (error?.response?.status === 429) {
//       throw new ApiError(
//         {},
//         429,
//         "Veed.io API rate limit exceeded. Please try again later."
//       );
//     }

//     if (error?.response?.status === 402) {
//       throw new ApiError(
//         {},
//         402,
//         "Veed.io API quota exceeded. Please check your subscription."
//       );
//     }

//     throw new ApiError(
//       {},
//       500,
//       error?.message || "An unexpected error occurred during video generation"
//     );
//   }
// };

// // Get video generation status
// export const getVideoStatus = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { videoId } = req.params;

//     if (!videoId) {
//       throw new ApiError({}, 400, "Video ID is required");
//     }

//     // Check status with Veed.io
//     const veedStatus = await checkVideoStatus(videoId);

//     const statusData = {
//       videoId,
//       status: veedStatus.status,
//       progress: veedStatus.progress || 0,
//       downloadUrl: veedStatus.download_url || null,
//       error: veedStatus.error || null,
//       message: getStatusMessage(veedStatus.status),
//       updatedAt: new Date().toISOString(),
//     };

//     res
//       .status(200)
//       .json(new ApiSuccess(statusData, "Video status retrieved successfully"));
//   } catch (error: any) {
//     console.error("Error getting video status:", error);

//     if (error instanceof ApiError) {
//       throw error;
//     }

//     throw new ApiError(
//       {},
//       500,
//       error?.message || "Failed to retrieve video status"
//     );
//   }
// };

// // Helper function to get user-friendly status messages
// const getStatusMessage = (status: string): string => {
//   switch (status?.toLowerCase()) {
//     case "queued":
//       return "Video generation is queued and will start soon...";
//     case "processing":
//     case "generating":
//       return "Video is being generated...";
//     case "completed":
//     case "ready":
//       return "Video generation completed successfully!";
//     case "failed":
//     case "error":
//       return "Video generation failed. Please try again.";
//     default:
//       return "Video status unknown. Please check again later.";
//   }
// };

// // Download completed video
// export const downloadVideo = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { videoId } = req.params;

//     if (!videoId) {
//       throw new ApiError({}, 400, "Video ID is required");
//     }

//     // Get video status first
//     const veedStatus = await checkVideoStatus(videoId);

//     if (veedStatus.status !== "completed" && veedStatus.status !== "ready") {
//       throw new ApiError({}, 400, "Video is not ready for download yet");
//     }

//     if (!veedStatus.download_url) {
//       throw new ApiError({}, 404, "Download URL not available");
//     }

//     // Redirect to download URL or proxy the download
//     res.redirect(veedStatus.download_url);
//   } catch (error: any) {
//     console.error("Error downloading video:", error);

//     if (error instanceof ApiError) {
//       throw error;
//     }

//     throw new ApiError({}, 500, error?.message || "Failed to download video");
//   }
// };
