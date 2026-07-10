import multer from "multer";
import path from "path";

const fileFilter = (_req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "application/x-tex",
    "text/x-tex",
    "image/png",
    "image/jpeg",
    "image/webp"
  ]);
  const allowedExtensions = new Set([".pdf", ".docx", ".doc", ".txt", ".tex", ".png", ".jpg", ".jpeg", ".webp"]);

  if (!allowedMimeTypes.has(file.mimetype) && !allowedExtensions.has(extension)) {
    callback(new Error("Only PDF, DOCX, DOC, TXT, TEX, and image files are allowed"));
    return;
  }

  callback(null, true);
};

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});

const readmeFileFilter = (_req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = new Set([".md", ".markdown", ".txt"]);
  const allowedMimeTypes = new Set([
    "text/markdown",
    "text/plain",
    "application/octet-stream"
  ]);

  if (!allowedExtensions.has(extension) && !allowedMimeTypes.has(file.mimetype)) {
    callback(new Error("Only README markdown or text files are allowed"));
    return;
  }

  callback(null, true);
};

export const projectReadmeUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: readmeFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});
