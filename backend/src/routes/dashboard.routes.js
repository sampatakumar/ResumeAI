import { Router } from "express";
import { getDashboardSummary, getFullProfileSnapshot } from "../contollers/dashboard.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/summary", verifyFirebaseToken, getDashboardSummary);
router.get("/profile", verifyFirebaseToken, getFullProfileSnapshot);

export default router;
