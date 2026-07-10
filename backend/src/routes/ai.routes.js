import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { incrementDailyCounter } from "../models/analytics.models.js";
import {
	analyzeJobDescriptionEndpoint,
	generateDescriptionBullets,
	parseResumeForOnboarding,
	extendProjectBullet,
	matchMasterDataForJd,
	generateUserProfileSummary,
	tailorResume,
	tailorResumeWithTwoStage
} from "../contollers/ai.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import { resumeUpload } from "../middlewares/multer.middleware.js";

const router = Router();

const heavyAiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 15,
	message: { success: false, message: "Too many requests from this IP, please try again later." },
    handler: (req, res, next, options) => {
        incrementDailyCounter("rateLimitHits", 1);
        res.status(options.statusCode).json(options.message);
    }
});

router.post("/tailor", verifyFirebaseToken, heavyAiLimiter, tailorResume);
router.post("/project-bullet/extend", verifyFirebaseToken, extendProjectBullet);
router.post("/profile-summary", verifyFirebaseToken, generateUserProfileSummary);
router.post("/description-bullets", verifyFirebaseToken, generateDescriptionBullets);
router.post("/onboarding/parse-resume", verifyFirebaseToken, heavyAiLimiter, (req, res, next) => {
	resumeUpload.single("resumeFile")(req, res, (error) => {
		if (error) {
			if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
				return res.status(413).json({
					success: false,
					message: "Resume file must not exceed 25 MB.",
					statusCode: 413
				});
			}
			next(error);
		}

		if (req.file) {
			const isPdfOrDocx = /\.(pdf|docx)$/i.test(req.file.originalname || "") ||
				req.file.mimetype === "application/pdf" ||
				req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

			if (!isPdfOrDocx) {
				return res.status(400).json({
					success: false,
					message: "Only PDF and DOCX files are allowed for onboarding.",
					statusCode: 400
				});
			}

			if (req.file.size > 2 * 1024 * 1024) {
				return res.status(413).json({
					success: false,
					message: "Onboarding resume file must not exceed 2 MB.",
					statusCode: 413
				});
			}
		}

		res.on("finish", () => {
			if (res.statusCode >= 200 && res.statusCode < 300) {
				incrementDailyCounter("resumesUploaded", 1);
			}
		});
		parseResumeForOnboarding(req, res, next);
	});
});

// Two-stage prompting endpoints (NEW)
router.post("/analyze-jd", verifyFirebaseToken, heavyAiLimiter, analyzeJobDescriptionEndpoint);
router.post("/match-master-data", verifyFirebaseToken, matchMasterDataForJd);
router.post("/tailor-two-stage", verifyFirebaseToken, heavyAiLimiter, tailorResumeWithTwoStage);

export default router;
