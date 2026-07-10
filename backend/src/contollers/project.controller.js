import path from "path";
import { z } from "zod";
import { Project } from "../models/project.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ProjectEntry } from "../classes/profile.classes.js";

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ?? "")
  .refine(
    (value) => value === "" || /^https?:\/\//i.test(value),
    "URL must start with http:// or https://"
  );

const createProjectSchema = z.object({
  title: z.string().trim().min(2, "title must be at least 2 characters"),
  description: z.string().trim().min(10, "description must be at least 10 characters").max(2000),
  stack: z.union([z.string(), z.array(z.string())]).optional().default(""),
  date: z.string().trim().optional().default(""),
  githubUrl: optionalUrlSchema,
  demoUrl: optionalUrlSchema
});

const cleanStackItem = (value) => {
  if (!value) {
    return "";
  }

  let cleaned = value
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();

  if (cleaned.includes(":")) {
    cleaned = cleaned.split(":").slice(1).join(":").trim();
  }

  cleaned = cleaned.replace(/\(.*?\)/g, "").trim();

  return cleaned;
};

const normalizeLine = (line) =>
  line
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/`/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .trim();

const extractTitle = (content, fallbackName) => {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  const firstContentLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("![") && !line.startsWith("[!["));

  if (firstContentLine) {
    return firstContentLine.replace(/^#+\s*/, "").trim();
  }

  return fallbackName;
};

const extractDescription = (content) => {
  const lines = content.split(/\r?\n/);
  const paragraph = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (paragraph.length > 0) {
        break;
      }
      continue;
    }

    if (/^#/.test(line) || /^```/.test(line) || /^!\[/.test(line) || /^\[!\[/.test(line)) {
      continue;
    }

    if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      continue;
    }

    paragraph.push(line);
  }

  if (paragraph.length === 0) {
    return "Project imported from README.";
  }

  return paragraph.join(" ").slice(0, 2000);
};

const extractUrls = (content) => {
  const urls = content.match(/https?:\/\/[^\s)]+/gi) ?? [];
  const githubUrl = urls.find((url) => url.toLowerCase().includes("github.com")) ?? "";
  const demoUrl = urls.find((url) => !url.toLowerCase().includes("github.com")) ?? "";

  return { githubUrl, demoUrl };
};

const extractStack = (content) => {
  const sectionMatch = content.match(
    /(?:^|\n)#{1,6}\s*(tech stack|technologies|built with|stack)\s*\n([\s\S]*?)(?=\n#{1,6}\s|$)/i
  );

  const stackValues = [];

  if (sectionMatch?.[2]) {
    for (const rawLine of sectionMatch[2].split(/\r?\n/)) {
      const cleaned = normalizeLine(rawLine);
      if (!cleaned) {
        continue;
      }

      cleaned
        .split(/,|\||\//)
        .map((item) => cleanStackItem(item))
        .filter(Boolean)
        .forEach((item) => stackValues.push(item));
    }
  }

  return Array.from(new Set(stackValues)).slice(0, 20);
};

const parseReadme = (file) => {
  const content = file.buffer.toString("utf8").replace(/\u0000/g, "");
  const fallbackTitle = path.basename(file.originalname, path.extname(file.originalname));
  const title = extractTitle(content, fallbackTitle);
  const description = extractDescription(content);
  const stack = extractStack(content);
  const { githubUrl, demoUrl } = extractUrls(content);

  return {
    title,
    description,
    stack,
    githubUrl,
    demoUrl,
    readmeContent: content.slice(0, 15000)
  };
};

export const listProjects = asyncHandler(async (req, res) => {
  const user = req.user;
  const projects = await Project.find({ owner: user._id }).sort({ updatedAt: -1 });

  return res.status(200).json(new ApiResponse(200, { projects }, "Projects fetched successfully"));
});

export const createProject = asyncHandler(async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid project payload", parsed.error.issues);
  }

  const user = req.user;
  const normalizedProject = ProjectEntry.from(parsed.data);

  const project = await Project.create({
    owner: user._id,
    ...normalizedProject.toObject(),
    source: "manual"
  });

  return res.status(201).json(new ApiResponse(201, { project }, "Project created successfully"));
});

export const updateProject = asyncHandler(async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid project payload", parsed.error.issues);
  }

  const user = req.user;
  const { projectId } = req.params;
  const normalizedProject = ProjectEntry.from(parsed.data);

  const updated = await Project.findOneAndUpdate(
    { _id: projectId, owner: user._id },
    {
      ...normalizedProject.toObject(),
      source: "manual"
    },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(404, "Project not found");
  }

  return res.status(200).json(new ApiResponse(200, { project: updated }, "Project updated successfully"));
});

export const createProjectFromReadme = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "README file is required");
  }

  const user = req.user;
  const parsedReadme = parseReadme(req.file);
  const normalizedProject = ProjectEntry.from(parsedReadme);

  const project = await Project.create({
    owner: user._id,
    ...normalizedProject.toObject(),
    readmeContent: parsedReadme.readmeContent,
    source: "readme",
    readmeOriginalName: req.file.originalname
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { project }, "Project created from README successfully"));
});

export const deleteProject = asyncHandler(async (req, res) => {
  const user = req.user;
  const { projectId } = req.params;

  const deleted = await Project.findOneAndDelete({ _id: projectId, owner: user._id });

  if (!deleted) {
    throw new ApiError(404, "Project not found");
  }

  return res.status(200).json(new ApiResponse(200, { projectId }, "Project deleted successfully"));
});
