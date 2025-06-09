import { Request, Response } from "express";
import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// Define valid sizes for OpenAI DALL-E
const validSizes = ["1024x1024", "1792x1024", "1024x1792"] as const;
type ValidSize = typeof validSizes[number];
// Function to map aspect ratio to OpenAI size format
const getImageSize = (aspectRatio: string): ValidSize => {
  switch (aspectRatio?.toLowerCase()) {
    case "square":
    case "1:1":
      return "1024x1024";
    case "landscape":
    case "16:9":
    case "wide":
      return "1792x1024";
    case "portrait":
    case "9:16":
    case "tall":
      return "1024x1792";
    default:
      return "1024x1024"; // Default to square
  }
};

// Function to enhance prompt with style
const enhancePromptWithStyle = (prompt: string, style?: string): string => {
  if (!style) return prompt;
  
  const styleMap: { [key: string]: string } = {
    "realistic": "photorealistic, high quality, detailed",
    "cartoon": "cartoon style, animated, colorful",
    "anime": "anime style, manga art, Japanese animation",
    "oil-painting": "oil painting style, artistic, classical art",
    "watercolor": "watercolor painting, soft colors, artistic",
    "sketch": "pencil sketch, hand-drawn, artistic sketch",
    "digital-art": "digital art, modern, clean design",
    "vintage": "vintage style, retro, classic",
    "minimalist": "minimalist design, clean, simple"
  };

  const styleDescription = styleMap[style.toLowerCase()] || style;
  return `${prompt}, ${styleDescription}`;
};
// If you have an image generation function, here's how to handle it:
export const generate_Image = async (req: Request, res: Response) => {
  const { prompt, style, aspect_ratio } = req.body;
  // Validate required prompt
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
     res.status(400).json({
      success: false,
      error: "Prompt is required and must be a non-empty string",
    });
  }
  try {
    // Enhance prompt with style if provided
    const enhancedPrompt = enhancePromptWithStyle(prompt, style);
    // Get appropriate image size based on aspect ratio
    const imageSize = getImageSize(aspect_ratio);
    console.log(
      `Generating image with prompt: "${enhancedPrompt}", size: ${imageSize}`
    );
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: imageSize,
      quality: "standard", // Can be "standard" or "hd"
    });

    // Proper type checking for image response
    if (response.data && response.data.length > 0 && response.data[0].url) {
      res.status(200).json({
        success: true,
        image: response.data[0].url,
        prompt_used: enhancedPrompt,
        size: imageSize,
        style: style || "default",
      });
    } else {
      res.status(500).json({
        success: false,
        error: "No image generated",
      });
    }
  } catch (error: any) {
    console.error("Image generation error:", error);

    // Handle specific OpenAI errors
    if (error?.error?.code === "content_policy_violation") {
      res.status(400).json({
        success: false,
        error: "Content policy violation. Please modify your prompt.",
      });
    } else if (error?.error?.code === "rate_limit_exceeded") {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded. Please try again later.",
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
};

//Shared image generation logic
const generateImageWithOpenAI = async (prompt: string, size: ValidSize, isRegenerate: boolean = false) => {
  // Add slight variation for regeneration
  const finalPrompt = isRegenerate 
    ? `${prompt}, alternative version, different composition` 
    : prompt;

  return await openai.images.generate({
    model: "dall-e-3",
    prompt: finalPrompt,
    n: 1,
    size: size,
    quality: "standard",
  });
};

////////// New regenerate function
export const regenerate_Image = async (req: Request, res: Response)  => {
  const { prompt, style, aspect_ratio } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
     res.status(400).json({
      success: false,
      error: "Prompt is required and must be a non-empty string",
    });
  }

  try {
    const enhancedPrompt = enhancePromptWithStyle(prompt, style);
    const imageSize = getImageSize(aspect_ratio);

    console.log(`Regenerating image with prompt: "${enhancedPrompt}", size: ${imageSize}`);

    const response = await generateImageWithOpenAI(enhancedPrompt, imageSize, true);

    if (response.data && response.data.length > 0 && response.data[0].url) {
      res.status(200).json({
        success: true,
        image: response.data[0].url,
        prompt_used: enhancedPrompt,
        size: imageSize,
        style: style || "default",
        regenerated: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: "No image regenerated",
      });
    }
  } catch (error: any) {
    console.error("Image regeneration error:", error);
    
    if (error?.error?.code === 'content_policy_violation') {
      res.status(400).json({
        success: false,
        error: "Content policy violation. Please modify your prompt.",
      });
    } else if (error?.error?.code === 'rate_limit_exceeded') {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded. Please try again later.",
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
};