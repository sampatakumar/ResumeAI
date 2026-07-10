import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { incrementDailyCounter } from "../models/analytics.models.js";
import { createResume, deleteResume, getResumeFile, listResumes } from "../contollers/resume.supabase.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import { resumeUpload } from "../middlewares/multer.middleware.js";

const router = Router();

const uploadLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 15,
	message: { success: false, message: "Too many resume uploads from this IP, please try again later." },
    handler: (req, res, next, options) => {
        incrementDailyCounter("rateLimitHits", 1);
        res.status(options.statusCode).json(options.message);
    }
});

router.use(verifyFirebaseToken);
router.get("/", listResumes);
router.get("/:resumeId/file", getResumeFile);
router.post("/", uploadLimiter, (req, res, next) => {
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
			return;
		}

		res.on("finish", () => {
			if (res.statusCode >= 200 && res.statusCode < 300) {
				incrementDailyCounter("resumesUploaded", 1);
			}
		});
		createResume(req, res, next);
	});
});
router.delete("/:resumeId", deleteResume);

export default router;
