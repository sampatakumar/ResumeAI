import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import { incrementDailyCounter } from "../models/analytics.models.js";
import { reviewCurrentResume, chatCurrentResume, reviewSavedResume } from "../contollers/resume-copilot.controller.js";

const router = Router();
const copilotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many Resume Copilot requests. Please try again shortly." },
  handler: (req, res, _next, options) => {
    incrementDailyCounter("rateLimitHits", 1);
    res.status(options.statusCode).json(options.message);
  }
});

router.use(verifyFirebaseToken);
router.post("/review", copilotLimiter, reviewCurrentResume);
router.post("/chat", copilotLimiter, chatCurrentResume);
router.post("/review-saved/:resumeId", copilotLimiter, reviewSavedResume);

export default router;
