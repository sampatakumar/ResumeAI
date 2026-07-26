import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  API_PREFIX: z.string().default("/api/v1"),
  CORS_ORIGIN: z.string().optional().default("*"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),

  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required")
    .refine(
      (val) => val !== "your_service_role_key",
      "SUPABASE_SERVICE_ROLE_KEY must be set to your actual Supabase service role key (not the placeholder)"
    ),
  SUPABASE_STORAGE_BUCKET: z.string().min(1, "SUPABASE_STORAGE_BUCKET is required").default("resumes"),

  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),

  CF_ACCOUNT_ID: z.string().optional().default(""),
  CF_API_TOKEN: z.string().optional().default("")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
}

export const env = parsed.data;
