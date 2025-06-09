import { Request, Response } from "express";;
import fs from "fs";
import path from "path";
// Extend Request interface to include file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const Background_Remove = async (req: MulterRequest, res: Response) => {
  console.log("req.file:", req.file);
  try {
    // Check if file was uploaded
    if (!req.file) {
       res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    const { outputFormat = "png" } = req.body;
    const inputPath = req.file!.path;

    // Validate output format
    const validFormats = ["png", "jpg", "jpeg"];
    if (!validFormats.includes(outputFormat.toLowerCase())) {
      // Clean up uploaded file
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
       res.status(400).json({
        success: false,
        error: "Invalid output format. Supported formats: png, jpg, jpeg",
      });
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

    // For now, let's just copy the file to test the upload works
    // Later you can replace this with actual background removal logic
    fs.copyFileSync(inputPath, outputPath);

    // Clean up input file
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    // Get output file stats
    const outputStats = fs.statSync(outputPath);

    // Return success response
    res.status(200).json({
      success: true,
      data: {
        processedImage: `/uploads/processed/${outputFilename}`,
        originalSize: req.file!.size,
        processedSize: outputStats.size,
        outputFormat: outputFormat,
        filename: outputFilename,
        message: "Image processed successfully",
      },
      message: "Processing completed",
    });
  } catch (error: any) {
    console.error("Image processing error:", error);

    // Clean up input file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to process image",
    });
  }
};
