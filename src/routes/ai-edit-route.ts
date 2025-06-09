import { Router, Request, Response, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Background_Remove } from "../control/ai-edit/ai-edit";
import { verify } from "../middleware/auth-middleware";

const router = Router();

// Ensure upload directories exist
const tempDir = path.join(process.cwd(), "uploads", "temp");
const processedDir = path.join(process.cwd(), "uploads", "processed");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: tempDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    console.log("File received:", file.originalname, file.mimetype);

    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Wrapper to handle multer errors
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  const uploadSingle = upload.single("image");

  uploadSingle(req, res, (error: any) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: "File too large. Maximum size is 10MB.",
        });
      }
      return res.status(400).json({
        success: false,
        error: `Upload error: ${error.message}`,
      });
    }

    if (error) {
      if (error.message === "Only image files are allowed") {
        return res.status(400).json({
          success: false,
          error: "Only image files are allowed",
        });
      }
      return res.status(500).json({
        success: false,
        error: "File upload error",
      });
    }

    next();
  });
};

// Apply routes
router.post("/remove-background", verify, handleUpload, Background_Remove);

export default router;
