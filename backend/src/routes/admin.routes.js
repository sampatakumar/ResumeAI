import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import { Analytics } from "../models/analytics.models.js";

const router = Router();

const ensureAdminMiddleware = (req, res, next) => {
  verifyFirebaseToken(req, res, (error) => {
    if (error) return next(error);
    
    // Strict admin check
    if (req.auth?.email !== "shrishpankajguptadbd6@gmail.com") {
      return res.status(403).json({ success: false, error: "Access Denied: Admins Only" });
    }
    
    next();
  });
};

router.get("/analytics", ensureAdminMiddleware, async (req, res) => {
  try {
    // Fetch the last 14 days of data to construct a robust chart
    const analytics = await Analytics.find()
      .sort({ date: -1 })
      .limit(14)
      .lean();
    
    return res.json({ success: true, data: analytics.reverse() });
  } catch (error) {
    console.error("[Admin API] Failed to fetch analytics", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

export default router;
