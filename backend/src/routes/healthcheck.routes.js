import { Router } from "express";
import { healthcheck } from "../contollers/healthcheck.controller.js";

const router = Router();

router.get("/", healthcheck);

export default router;
