import { Router } from "express";
import {
	firebaseSignIn,
	getCurrentUser,
	updateCurrentUser
} from "../contollers/auth.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/firebase/sign-in", verifyFirebaseToken, firebaseSignIn);
router.get("/me", verifyFirebaseToken, getCurrentUser);
router.patch("/me", verifyFirebaseToken, updateCurrentUser);

export default router;
