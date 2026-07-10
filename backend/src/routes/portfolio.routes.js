import { Router } from "express";
import { randomUUID } from "crypto";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import { exportPortfolioToGitHub } from "../contollers/portfolio.controller.js";
import { publishPortfolio } from "../services/portfolioService.js";
import { incrementDailyCounter } from "../models/analytics.models.js";

const router = Router();
const BUILD_JOB_TTL_MS = 5 * 60 * 1000;

const activeBuildJobs = new Map();

const scheduleJobCleanup = (jobId) => {
  setTimeout(() => {
    activeBuildJobs.delete(jobId);
  }, BUILD_JOB_TTL_MS);
};



const buildFriendlyError = (error) => {
  const rawDetails = error?.message || "Unknown error";
  const stack = error?.stack || "";

  if (rawDetails.toLowerCase().includes("cloudflare") || stack.includes("deployToCloudflare")) {
    return "Deployment failed due to Cloudflare.";
  }

  if (rawDetails.toLowerCase().includes("vite") || stack.includes("buildViteProject")) {
    return "Deployment failed due to backend build compilation.";
  }

  if (rawDetails.toLowerCase().includes("timeout") || rawDetails.includes("Abort")) {
    return "Deployment failed because the backend timed out.";
  }

  return `Deployment failed: ${rawDetails}`;
};

router.post("/publish", verifyFirebaseToken, async (req, res) => {
  const traceId = randomUUID();
  const jobId = randomUUID();
  const startedAt = Date.now();
  const { preference = "", customDomain = "" } = req.body || {};

  console.info("[portfolio/publish:queued]", {
    traceId,
    jobId,
    uid: req.user?.id
  });

  activeBuildJobs.set(jobId, {
    ownerId: req.user.id,
    status: "processing",
    progress: 0
  });

  // Respond to frontend instantly to avoid load balancer timeouts.
  res.json({ success: true, jobId, traceId });

  // Fire and forget heavy task in background.
  (async () => {
    try {
      const { url, domainInfo } = await publishPortfolio(req.user.id, preference, customDomain, {
        traceId
      });

      await incrementDailyCounter("portfoliosPublished", 1);

      console.info("[portfolio/publish:success]", {
        traceId,
        jobId,
        uid: req.user?.id,
        url,
        durationMs: Date.now() - startedAt
      });

      activeBuildJobs.set(jobId, {
        ownerId: req.user.id,
        status: "completed",
        url,
        customDomain: domainInfo?.domain || String(customDomain || "").trim(),
        domainSetup: domainInfo
      });
      scheduleJobCleanup(jobId);
    } catch (error) {
      console.error("[portfolio/publish:error]", {
        traceId,
        jobId,
        uid: req.user?.id,
        message: error?.message || "Unknown error",
        durationMs: Date.now() - startedAt
      });

      activeBuildJobs.set(jobId, {
        ownerId: req.user.id,
        status: "failed",
        error: buildFriendlyError(error)
      });
      scheduleJobCleanup(jobId);
    }
  })();
});

router.get("/status/:jobId", verifyFirebaseToken, (req, res) => {
  const { jobId } = req.params;
  const job = activeBuildJobs.get(jobId);

  if (!job || job.ownerId !== req.user.id) {
    return res.status(404).json({ success: false, error: "Job ID not found or expired." });
  }

  const { ownerId, ...publicJob } = job;
  res.json({ success: true, ...publicJob });
});

router.post("/github", verifyFirebaseToken, exportPortfolioToGitHub);

export default router;
