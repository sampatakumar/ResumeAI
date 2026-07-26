import { z } from "zod";
import path from "path";
import { env } from "../config/env.js";
import { Resume } from "../models/resume.models.js";
import {
  deleteResumeFromSupabaseStorage,
  downloadResumeFromSupabaseStorage,
  getSupabaseResumeSignedReadUrl,
  resolveSupabaseResumeStorageLocation,
  uploadResumeToSupabaseStorage
} from "../utils/supabase-storage.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createResumeSchema = z.object({
  title: z.string().min(2, "title must be at least 2 characters"),
  format: z.enum(["PDF", "DOCX", "TXT", "TEX", "IMAGE"]).optional(),
  sections: z.number().int().min(1).max(30).optional(),
  content: z.string().optional()
});

const makeTraceId = () => `resume-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const inferMimeTypeFromResume = (resume) => {
  const extension = path
    .extname(
      String(
        resume.originalFileName ||
          resume.storedFileName ||
          resume.supabaseStoragePath ||
          resume.filePath ||
          ""
      )
    )
    .toLowerCase();

  if (resume.mimeType) {
    return resume.mimeType;
  }

  if (extension === ".pdf") return "application/pdf";
  if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === ".doc") return "application/msword";
  if (extension === ".txt") return "text/plain; charset=utf-8";
  if (extension === ".tex") return "application/x-tex";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";

  return "application/octet-stream";
};

const buildInlineContentDisposition = (fileName) => {
  const fallbackName =
    String(fileName || "resume")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/["\\]/g, "")
      .trim() || "resume";
  const encodedName = encodeURIComponent(String(fileName || fallbackName));

  return `inline; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
};

const buildSignedResumeFileMeta = async (resume, traceId) => {
  const supabaseLocation = resolveSupabaseResumeStorageLocation(resume);

  if (!supabaseLocation.storagePath) {
    return {
      filePath: "",
      signedUrlExpiresAt: ""
    };
  }

  const signedFile = await getSupabaseResumeSignedReadUrl({
    bucketName: supabaseLocation.bucketName,
    storagePath: supabaseLocation.storagePath
  });

  console.info(`[resume-debug][${traceId}] signedUrl:generated`, {
    resumeId: String(resume._id || ""),
    supabaseStoragePath: supabaseLocation.storagePath,
    supabaseStorageBucket: supabaseLocation.bucketName,
    expiresAt: signedFile.expiresAt
  });

  return {
    filePath: signedFile.url,
    signedUrlExpiresAt: new Date(signedFile.expiresAt).toISOString()
  };
};

const resolveResumeFileResponse = async (resume, traceId) => {
  const supabaseLocation = resolveSupabaseResumeStorageLocation(resume);

  if (!supabaseLocation.storagePath) {
    throw new ApiError(404, "Resume file is not available in Supabase Storage");
  }

  try {
    const supabaseFile = await downloadResumeFromSupabaseStorage(supabaseLocation);

    console.info(`[resume-debug][${traceId}] getResumeFile:source-supabase`, {
      resumeId: String(resume._id || ""),
      supabaseStoragePath: supabaseLocation.storagePath,
      supabaseStorageBucket: supabaseLocation.bucketName,
      bytes: supabaseFile.buffer.length
    });

    return {
      buffer: supabaseFile.buffer,
      contentType: supabaseFile.contentType || inferMimeTypeFromResume(resume),
      fileName: resume.originalFileName || resume.storedFileName || "resume"
    };
  } catch (error) {
    console.warn(`[resume-debug][${traceId}] getResumeFile:source-supabase:failed`, {
      resumeId: String(resume._id || ""),
      supabaseStoragePath: supabaseLocation.storagePath,
      error: error instanceof Error ? error.message : String(error)
    });

    throw new ApiError(502, "Failed to read resume file from Supabase Storage");
  }
};

const resolveFileMeta = (file, supabaseUpload = null) => {
  if (!file) {
    return {};
  }

  if (!supabaseUpload?.storagePath || !supabaseUpload?.bucketName) {
    throw new ApiError(502, "Supabase Storage upload failed for the resume file");
  }

  return {
    originalFileName: file.originalname,
    storedFileName: supabaseUpload.fileName,
    filePath: supabaseUpload.filePath,
    mimeType: file.mimetype,
    fileSize: file.size || file.buffer?.length || 0,
    storageProvider: "supabase",
    supabaseStoragePath: supabaseUpload.storagePath,
    supabaseStorageBucket: supabaseUpload.bucketName
  };
};

export const listResumes = asyncHandler(async (req, res) => {
  const traceId = makeTraceId();
  const user = req.user;

  console.info(`[resume-debug][${traceId}] listResumes:start`, {
    firebaseUid: req.auth.uid,
    userId: String(user?._id || "")
  });

  const resumes = await Resume.find({ owner: user._id }).sort({ updatedAt: -1 });

  console.info(`[resume-debug][${traceId}] listResumes:fetched`, {
    count: resumes.length
  });

  const normalizedResumes = await Promise.all(
    resumes.map(async (resume) => {
      const plainResume = resume.toObject();
      const supabaseLocation = resolveSupabaseResumeStorageLocation(plainResume);

      if (supabaseLocation.storagePath) {
        const signedFileMeta = await buildSignedResumeFileMeta(plainResume, traceId);
        plainResume.filePath = signedFileMeta.filePath;
        plainResume.signedUrlExpiresAt = signedFileMeta.signedUrlExpiresAt;
        plainResume.storageProvider = plainResume.storageProvider || "supabase";

        console.info(`[resume-debug][${traceId}] listResumes:item-supabase`, {
          resumeId: String(plainResume._id || ""),
          title: plainResume.title,
          supabaseStoragePath: supabaseLocation.storagePath,
          supabaseStorageBucket: supabaseLocation.bucketName,
          filePath: plainResume.filePath
        });

        return plainResume;
      }

      plainResume.filePath = "";
      plainResume.storageProvider = plainResume.storageProvider || "unavailable";

      console.warn(`[resume-debug][${traceId}] listResumes:item-unavailable`, {
        resumeId: String(plainResume._id || ""),
        title: plainResume.title,
        storageProvider: plainResume.storageProvider
      });

      return plainResume;
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { resumes: normalizedResumes }, "Resumes fetched successfully"));
});

export const createResume = asyncHandler(async (req, res) => {
  const traceId = makeTraceId();
  const hasUpload = Boolean(req.file);
  const body = {
    ...req.body,
    sections: req.body.sections ? Number(req.body.sections) : undefined
  };

  console.info(`[resume-debug][${traceId}] createResume:start`, {
    firebaseUid: req.auth.uid,
    hasUpload,
    frontendTraceId: typeof req.body?.debugTraceId === "string" ? req.body.debugTraceId : "",
    body: {
      title: body.title,
      sections: body.sections,
      format: body.format,
      contentLength: typeof body.content === "string" ? body.content.length : 0
    },
    file: req.file
      ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size || req.file.buffer?.length || 0,
          hasBuffer: Boolean(req.file.buffer?.length)
        }
      : null
  });

  const parsed = createResumeSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid resume payload", parsed.error.issues);
  }

  const user = req.user;
  let supabaseUpload = null;

  if (req.file) {
    console.info(`[resume-debug][${traceId}] createResume:supabase-upload:start`, {
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      bytes: req.file.size || req.file.buffer?.length || 0
    });

    try {
      supabaseUpload = await uploadResumeToSupabaseStorage({
        buffer: req.file.buffer,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        ownerKey: req.auth.uid
      });

      console.info(`[resume-debug][${traceId}] createResume:supabase-upload:response`, {
        bucketName: supabaseUpload.bucketName,
        storagePath: supabaseUpload.storagePath,
        fileName: supabaseUpload.fileName,
        filePath: supabaseUpload.filePath,
        size: supabaseUpload.size
      });
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
      console.error(`[resume-debug][${traceId}] createResume:supabase-upload:error`, {
        error: errorMessage
      });
      throw new ApiError(502, `Resume upload failed: ${errorMessage}`);
    }
  }

  const detectedFormat = req.file
    ? req.file.originalname.toLowerCase().endsWith(".docx")
      ? "DOCX"
      : req.file.originalname.toLowerCase().endsWith(".txt")
      ? "TXT"
      : req.file.originalname.toLowerCase().endsWith(".tex")
      ? "TEX"
      : new Set([".png", ".jpg", ".jpeg", ".webp"]).has(path.extname(req.file.originalname).toLowerCase())
      ? "IMAGE"
      : "PDF"
    : parsed.data.format || "PDF";

  const resolvedFileMeta = resolveFileMeta(req.file, supabaseUpload);

  console.info(`[resume-debug][${traceId}] createResume:resolved-file-meta`, {
    filePath: resolvedFileMeta.filePath,
    storageProvider: resolvedFileMeta.storageProvider,
    supabaseStoragePath: resolvedFileMeta.supabaseStoragePath,
    supabaseStorageBucket: resolvedFileMeta.supabaseStorageBucket
  });

  const resume = await Resume.create({
    owner: user._id,
    ...parsed.data,
    ...resolvedFileMeta,
    format: detectedFormat,
    title: req.file ? parsed.data.title || req.file.originalname.replace(/\.[^.]+$/, "") : parsed.data.title,
    content: hasUpload ? parsed.data.content || "Uploaded resume" : parsed.data.content || ""
  });

  console.info(`[resume-debug][${traceId}] createResume:db-saved`, {
    resumeId: String(resume._id || ""),
    title: resume.title,
    format: resume.format,
    filePath: resume.filePath,
    storageProvider: resume.storageProvider,
    supabaseStoragePath: resume.supabaseStoragePath
  });

  const responseResume = resume.toObject();
  if (resolveSupabaseResumeStorageLocation(responseResume).storagePath) {
    const signedFileMeta = await buildSignedResumeFileMeta(responseResume, traceId);
    responseResume.filePath = signedFileMeta.filePath;
    responseResume.signedUrlExpiresAt = signedFileMeta.signedUrlExpiresAt;
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { resume: responseResume }, "Resume created successfully"));
});

export const getResumeFile = asyncHandler(async (req, res) => {
  const traceId = makeTraceId();
  const user = req.user;
  const { resumeId } = req.params;

  const resume = await Resume.findOne({ _id: resumeId, owner: user._id });

  if (!resume) {
    throw new ApiError(404, "Resume not found");
  }

  console.info(`[resume-debug][${traceId}] getResumeFile:start`, {
    resumeId,
    title: resume.title,
    storedFileName: resume.storedFileName,
    storageProvider: resume.storageProvider,
    supabaseStoragePath: resume.supabaseStoragePath
  });

  const fileResponse = await resolveResumeFileResponse(resume, traceId);

  res.setHeader("Content-Type", fileResponse.contentType || "application/octet-stream");
  res.setHeader("Content-Disposition", buildInlineContentDisposition(fileResponse.fileName));
  res.setHeader("Cache-Control", "private, max-age=300");

  return res.status(200).send(fileResponse.buffer);
});

export const deleteResume = asyncHandler(async (req, res) => {
  const user = req.user;
  const { resumeId } = req.params;

  const deleted = await Resume.findOneAndDelete({ _id: resumeId, owner: user._id });

  if (!deleted) {
    throw new ApiError(404, "Resume not found");
  }

  const supabaseLocation = resolveSupabaseResumeStorageLocation(deleted);
  if (supabaseLocation.storagePath) {
    try {
      await deleteResumeFromSupabaseStorage(supabaseLocation);
    } catch {
      // ignore remote deletion failure to avoid blocking DB cleanup
    }
  }

  return res.status(200).json(new ApiResponse(200, { resumeId }, "Resume deleted successfully"));
});
