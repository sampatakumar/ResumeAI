import { Router } from "express";
import {
  createProject,
  createProjectFromReadme,
  deleteProject,
  listProjects,
  updateProject
} from "../contollers/project.controller.js";
import { verifyFirebaseToken } from "../middlewares/auth.middleware.js";
import { projectReadmeUpload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyFirebaseToken);
router.get("/", listProjects);
router.post("/", createProject);
router.post("/from-readme", (req, res, next) => {
  projectReadmeUpload.single("readmeFile")(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    createProjectFromReadme(req, res, next);
  });
});
router.delete("/:projectId", deleteProject);
router.patch("/:projectId", updateProject);

export default router;
