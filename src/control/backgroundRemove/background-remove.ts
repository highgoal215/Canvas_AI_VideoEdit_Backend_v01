import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { ProcessedImage } from "../../models/ProcessedImage";

// Extend Request interface to include file and user
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  user?: {
    userId: number;
    email: string;
  };
}

export const Background_Remove = async (
  req: MulterRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("-------------->req.file:", req.file);
  console.log("========<>req.body:", req.body);

  try {
    // Check if user is authenticated
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "No image file provided",
      });
      return;
    }
    // Check if API key is configured
    if (!process.env.REMOVEBG_API_KEY) {
      res.status(500).json({
        success: false,
        error:
          "Remove.bg API key not configured. Please add REMOVEBG_API_KEY to your .env file",
      });
      return;
    }

    const inputPath = req.file.path;

    // Safely get outputFormat with default value
    const outputFormat = req.body?.outputFormat
      ? String(req.body.outputFormat).toLowerCase()
      : "png";

    console.log("Output format:", outputFormat);

    // Validate output format
    const validFormats = ["png", "jpg", "jpeg"];
    if (!validFormats.includes(outputFormat)) {
      // Clean up uploaded file
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
      res.status(400).json({
        success: false,
        error: "Invalid output format. Supported formats: png, jpg, jpeg",
      });
      return;
    }

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "uploads", "processed");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate output filename
    const timestamp = Date.now();
    const outputFilename = `bg_removed_${timestamp}.${outputFormat}`;
    const outputPath = path.join(outputDir, outputFilename);

    console.log("Processing image:", inputPath);
    console.log("Output path:", outputPath);

    // Prepare form data for Remove.bg API
    const formData = new FormData();
    formData.append("image_file", fs.createReadStream(inputPath));
    formData.append("size", "auto");

    if (outputFormat !== "png") {
      formData.append("format", outputFormat);
    }

    console.log("Calling Remove.bg API...");

    // Call Remove.bg API
    const response = await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      formData,
      {
        headers: {
          "X-Api-Key": process.env.REMOVEBG_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    // Write the processed image
    fs.writeFileSync(outputPath, response.data);

    // Clean up input file
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    // Get output file stats
    const outputStats = fs.statSync(outputPath);

    // Save processed image information to database
    const processedImage = await ProcessedImage.create({
      userId: req.user.userId,
      originalImagePath: req.file.path,
      processedImagePath: outputPath,
      outputFormat: outputFormat,
      originalSize: req.file.size,
      processedSize: outputStats.size,
    });

    console.log("Background removal completed successfully");

    // Return success response
    res.status(200).json({
      success: true,
      data: {
        processedImage: `/uploads/processed/${outputFilename}`,
        downloadUrl: `http://localhost:${process.env.PORT || 3000}/uploads/processed/${outputFilename}`,
        originalSize: req.file.size,
        processedSize: outputStats.size,
        outputFormat: outputFormat,
        filename: outputFilename,
        message: "Background removed successfully",
        imageId: processedImage.id,
      },
      message: "Processing completed",
    });
  } catch (error: any) {
    console.error("Background removal error:", error);

    // Clean up input file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
    }

    // Handle specific API errors
    if (error.response) {
      const statusCode = error.response.status;
      let errorMessage = "Failed to remove background";

      switch (statusCode) {
        case 400:
          errorMessage = "Invalid image format or corrupted file";
          break;
        case 402:
          errorMessage = "Insufficient API credits";
          break;
        case 403:
          errorMessage = "Invalid API key";
          break;
        case 429:
          errorMessage = "Rate limit exceeded";
          break;
        default:
          errorMessage = `API error: ${statusCode}`;
      }

      res.status(statusCode === 402 || statusCode === 403 ? 503 : 400).json({
        success: false,
        error: errorMessage,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to remove background",
    });
  }
};
