import { z } from "zod";
import { Resume } from "../models/resume.models.js";
import { extractResumeRawText } from "../services/resume-extraction.service.js";
import { reviewResumeWithAi, chatWithResumeAi, serializeResume } from "../services/resume-copilot.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const resumePayload = z.object({
  resume: z.record(z.string(), z.unknown()).optional(),
  resumeText: z.string().max(18000).optional().default(""),
  jobRole: z.string().max(120).optional().default("")
});

const reviewSchema = resumePayload.refine((body) => body.resumeText.trim().length >= 30 || serializeResume(body.resume).length >= 30, {
  message: "Add more resume content before requesting a review."
});

const chatSchema = resumePayload.extend({
  savedResumeId: z.string().regex(/^[a-f\\d]{24}$/i).optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2500)
  })).min(1).max(20)
}).refine((body) => Boolean(body.savedResumeId) || body.resumeText.trim().length >= 20 || serializeResume(body.resume).length >= 20, {
  message: "Add more resume content before chatting with Resume Copilot."
});

export const reviewCurrentResume = asyncHandler(async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body || {});
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || "Invalid resume review request");
  const payload = parsed.data;
  const resumeText = payload.resumeText.trim() || serializeResume(payload.resume);
  const review = await reviewResumeWithAi({ resumeText, resume: payload.resume, jobRole: payload.jobRole });
  res.status(200).json(new ApiResponse(200, review, "Resume review completed"));
});

export const chatCurrentResume = asyncHandler(async (req, res) => {
  const parsed = chatSchema.safeParse(req.body || {});
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || "Invalid resume chat request");
  const payload = parsed.data;
  let resumeText = payload.resumeText.trim() || serializeResume(payload.resume);
  if (payload.savedResumeId) {
    const savedResume = await Resume.findOne({ _id: payload.savedResumeId, owner: req.user._id });
    if (!savedResume) throw new ApiError(404, "Resume not found");
    resumeText = await extractResumeRawText(savedResume);
    if (!resumeText || resumeText.trim().length < 20) throw new ApiError(422, "Could not extract readable text from this resume.");
  }
  const reply = await chatWithResumeAi({ resumeText, jobRole: payload.jobRole, messages: payload.messages });
  res.status(200).json(new ApiResponse(200, { reply }, "Resume Copilot replied"));
});

export const reviewSavedResume = asyncHandler(async (req, res) => {
  const resumeId = String(req.params.resumeId || "");
  if (!/^[a-f\d]{24}$/i.test(resumeId)) throw new ApiError(400, "Invalid resume ID");
  const savedResume = await Resume.findOne({ _id: resumeId, owner: req.user._id });
  if (!savedResume) throw new ApiError(404, "Resume not found");
  const resumeText = await extractResumeRawText(savedResume);
  if (!resumeText || resumeText.trim().length < 30) {
    throw new ApiError(422, "Could not extract readable text from this resume. Try uploading a text-based PDF or DOCX.");
  }
  const jobRole = String(req.body?.jobRole || "").slice(0, 120);
  const review = await reviewResumeWithAi({ resumeText, jobRole });
  res.status(200).json(new ApiResponse(200, { ...review, resumeTitle: savedResume.title, resumeId }, "Uploaded resume review completed"));
});
