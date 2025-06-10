import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface LayoutGenerateRequest {
  content_type: string;
  content_description: string;
  style: string;
  aspect_ratio: string;
}

// Helper function to validate aspect ratio
const validateAspectRatio = (aspectRatio: string): boolean => {
  const validRatios = ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"];
  return validRatios.includes(aspectRatio);
};

// Helper function to enhance prompt with style
const enhancePromptWithStyle = (prompt: string, style?: string): string => {
  if (!style) return prompt;
  
  const styleMap: { [key: string]: string } = {
    "modern": "modern, clean, minimalist design",
    "classic": "classic, traditional, elegant design",
    "corporate": "professional, corporate, business-like design",
    "creative": "creative, artistic, unique design",
    "minimalist": "minimalist, simple, clean design",
    "vintage": "vintage, retro, classic design",
    "luxury": "luxury, premium, high-end design",
    "playful": "playful, fun, energetic design",
    "elegant": "elegant, sophisticated, refined design"
  };

  const styleDescription = styleMap[style.toLowerCase()] || style;
  return `${prompt}, ${styleDescription}`;
};

export const generate_Layout = async (req: Request, res: Response): Promise<void> => {
  const { content_type, content_description, style, aspect_ratio }: LayoutGenerateRequest = req.body;

  // Validate required fields
  if (!content_type || !content_description) {
    res.status(400).json({
      success: false,
      error: "Content type and description are required"
    });
    return;
  }

  // Validate aspect ratio
  if (!validateAspectRatio(aspect_ratio)) {
    res.status(400).json({
      success: false,
      error: "Invalid aspect ratio. Valid options: 1:1, 16:9, 9:16, 4:3, 3:4, 21:9"
    });
    return;
  }

  try {
    // Create a detailed prompt for layout generation
    const basePrompt = `Generate a detailed layout description for a ${content_type} with the following specifications:
    - Content Description: ${content_description}
    - Aspect Ratio: ${aspect_ratio}
    - Style: ${style || 'default'}
    
    Please provide a detailed layout description including:
    1. Overall composition and structure
    2. Key elements placement
    3. Visual hierarchy
    4. Spacing and alignment
    5. Specific measurements and proportions
    6. Color scheme recommendations
    7. Typography suggestions
    8. Any special considerations for the given aspect ratio`;

    const enhancedPrompt = enhancePromptWithStyle(basePrompt, style);

    const response = await openai.chat.completions.create({
      model: "dall-e-3",
      messages: [
        {
          role: "system",
          content: "You are an expert layout designer with deep knowledge of visual composition, typography, and design principles. Provide detailed, practical layout descriptions that can be implemented by designers."
        },
        {
          role: "user",
          content: enhancedPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    if (!response.choices?.[0]?.message?.content) {
      res.status(500).json({
        success: false,
        error: "Failed to generate layout description"
      });
      return;
    }

    const layoutDescription = response.choices[0].message.content;

    // Generate a visual representation using DALL-E
    const visualPrompt = `Create a professional layout design for ${content_type} with ${content_description}. Style: ${style}. Aspect ratio: ${aspect_ratio}. Show a clean, professional layout with proper spacing and composition.`;

    const visualResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: visualPrompt,
      n: 1,
      size: aspect_ratio === "1:1" ? "1024x1024" : 
            aspect_ratio === "16:9" ? "1792x1024" : 
            aspect_ratio === "9:16" ? "1024x1792" : "1024x1024",
      quality: "standard"
    });

    // Safely access the image URL with proper type checking
    const imageUrl = visualResponse.data?.[0]?.url;

    if (!imageUrl) {
      res.status(500).json({
        success: false,
        error: "Failed to generate visual reference"
      });
      return;
    }

    res.status(200).json({
      success: true,
      layout: {
        description: layoutDescription,
        visual_reference: imageUrl,
        specifications: {
          content_type,
          content_description,
          style: style || "default",
          aspect_ratio
        }
      }
    });
  } catch (error: any) {
    console.error("Layout generation error:", error);
    
    if (error?.error?.code === "content_policy_violation") {
      res.status(400).json({
        success: false,
        error: "Content policy violation. Please modify your request."
      });
    } else if (error?.error?.code === "rate_limit_exceeded") {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded. Please try again later."
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  }
}; 