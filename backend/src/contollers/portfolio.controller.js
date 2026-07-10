import { z } from "zod";
import { buildPortfolioSourceBundle } from "../services/portfolioService.js";
import { pushPortfolioSourceToGitHub } from "../services/github-export.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const githubExportSchema = z.object({
  token: z.string().trim().min(20),
  repoName: z.string().trim().min(2).max(100),
  repoOwner: z.string().trim().max(100).optional().default(""),
  branch: z.string().trim().min(1).max(100).optional().default("main"),
  pathPrefix: z.string().trim().max(120).optional().default(""),
  preference: z
    .object({
      theme: z.enum(["minimal", "dark", "glassmorphism", "cyberpunk"]).optional(),
      font: z.enum(["Inter", "JetBrains Mono", "Sora", "Space Grotesk"]).optional(),
      animations: z.enum(["none", "subtle", "rich"]).optional(),
      accent: z.string().max(32).optional(),
      notes: z.string().max(500).optional()
    })
    .optional(),
  createRepo: z.boolean().optional().default(true),
  privateRepo: z.boolean().optional().default(false)
});

export const exportPortfolioToGitHub = asyncHandler(async (req, res) => {
  const parsed = githubExportSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid GitHub export payload", parsed.error.issues);
  }

  const bundle = await buildPortfolioSourceBundle(req.auth.uid, parsed.data.preference || {}, {
    traceId: req.traceId || ""
  });

  const exportResult = await pushPortfolioSourceToGitHub({
    token: parsed.data.token,
    owner: parsed.data.repoOwner || "",
    repoName: parsed.data.repoName,
    branch: parsed.data.branch,
    pathPrefix: parsed.data.pathPrefix,
    filesMap: bundle.generatedProject.filesMap,
    createRepo: parsed.data.createRepo,
    privateRepo: parsed.data.privateRepo,
    traceId: req.traceId || ""
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        repoUrl: exportResult.repoUrl,
        owner: exportResult.owner,
        repoName: exportResult.repoName,
        branch: exportResult.branch,
        pathPrefix: exportResult.pathPrefix,
        filesUpdated: exportResult.filesUpdated,
        createdRepo: exportResult.createdRepo
      },
      "Portfolio source exported to GitHub successfully"
    )
  );
});
