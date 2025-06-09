import { Request, Response } from "express";
import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
export const generate_Text = async (req: Request, res: Response) => {
  const { prompt } = req.body;
  console.log(prompt);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    // Check if response and choices exist
    if (response.choices && response.choices.length > 0) {
      res.status(200).json({
        success: true,
        message: response.choices[0].message?.content || "No content generated",
      });
      console.log("respond::",response.choices[0].message?.content)
    } else {
      res.status(500).json({
        success: false,
        error: "No response generated",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

