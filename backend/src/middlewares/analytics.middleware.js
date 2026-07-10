import { logApiHit } from "../models/analytics.models.js";

export const apiHitTracker = (req, res, next) => {
  // Non-blocking, fire and forget
  const route = req.baseUrl + (req.route ? req.route.path : req.path);
  
  // Clean trailing slashes
  const cleanRoute = route.endsWith("/") && route.length > 1 ? route.slice(0, -1) : route;

  // Don't track the healthcheck or admin paths to prevent massive noise
  if (!cleanRoute.startsWith("/health") && !cleanRoute.startsWith("/admin")) {
    logApiHit(cleanRoute || "/");
  }

  next();
};
