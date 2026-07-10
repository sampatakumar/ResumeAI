import { createClient } from "@supabase/supabase-js";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";

// Initialize Supabase Client
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const normalizeStorageSegment = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "anonymous";

const sanitizeFileName = (value) =>
  String(value || "resume")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "resume";

const parseSupabaseStorageUri = (value) => {
  const match = String(value || "").trim().match(/^supabase:\/\/([^/]+)\/(.+)$/i);
  if (!match) {
    return {
      bucketName: "",
      storagePath: ""
    };
  }
  return {
    bucketName: match[1],
    storagePath: match[2]
  };
};

export const buildSupabaseStorageUri = (bucketName, storagePath) => {
  const normalizedBucketName = String(bucketName || "").trim();
  const normalizedStoragePath = String(storagePath || "").trim();
  if (!normalizedBucketName || !normalizedStoragePath) {
    return "";
  }
  return `supabase://${normalizedBucketName}/${normalizedStoragePath}`;
};

export const resolveSupabaseResumeStorageLocation = (resume = {}) => {
  const explicitStoragePath = String(resume.supabaseStoragePath || "").trim();
  if (explicitStoragePath) {
    return {
      bucketName: String(resume.supabaseStorageBucket || env.SUPABASE_STORAGE_BUCKET).trim(),
      storagePath: explicitStoragePath
    };
  }
  return parseSupabaseStorageUri(resume.filePath);
};

const buildResumeStoragePath = ({ ownerKey, originalFileName }) => {
  const safeOwnerKey = normalizeStorageSegment(ownerKey);
  const safeFileName = sanitizeFileName(originalFileName);
  return path.posix.join(
    safeOwnerKey,
    `${Date.now()}-${randomUUID()}-${safeFileName}`
  );
};

export const uploadResumeToSupabaseStorage = async ({ buffer, originalFileName, mimeType, ownerKey }) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Resume file buffer is required for Supabase Storage upload");
  }

  const bucketName = env.SUPABASE_STORAGE_BUCKET;
  const storagePath = buildResumeStoragePath({
    ownerKey,
    originalFileName
  });

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, buffer, {
      contentType: mimeType || "application/octet-stream",
      cacheControl: "private, max-age=0, no-transform",
      upsert: true
    });

  if (error) {
    throw error;
  }

  return {
    bucketName,
    storagePath,
    fileName: path.posix.basename(storagePath),
    contentType: mimeType || "application/octet-stream",
    size: buffer.length,
    filePath: buildSupabaseStorageUri(bucketName, storagePath)
  };
};

export const downloadResumeFromSupabaseStorage = async ({ bucketName, storagePath }) => {
  if (!storagePath) {
    throw new Error("Supabase Storage path is required");
  }

  const { data, error } = await supabase.storage
    .from(bucketName || env.SUPABASE_STORAGE_BUCKET)
    .download(storagePath);

  if (error) {
    throw error;
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    contentType: data.type || "application/octet-stream",
    contentLength: String(data.size || buffer.length)
  };
};

export const getSupabaseResumeSignedReadUrl = async ({
  bucketName,
  storagePath,
  expiresInMinutes = 60
}) => {
  if (!storagePath) {
    throw new Error("Supabase Storage path is required");
  }

  const resolvedBucketName = bucketName || env.SUPABASE_STORAGE_BUCKET;
  const expiresInSeconds = Number(expiresInMinutes) * 60;

  const { data, error } = await supabase.storage
    .from(resolvedBucketName)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw error;
  }

  return {
    url: data.signedUrl,
    expiresAt: Date.now() + expiresInSeconds * 1000
  };
};

export const deleteResumeFromSupabaseStorage = async ({ bucketName, storagePath }) => {
  if (!storagePath) {
    return;
  }

  const resolvedBucketName = bucketName || env.SUPABASE_STORAGE_BUCKET;
  const { error } = await supabase.storage
    .from(resolvedBucketName)
    .remove([storagePath]);

  if (error) {
    throw error;
  }
};
