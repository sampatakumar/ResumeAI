import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserByFirebaseUid = vi.fn();

vi.mock("../src/services/user.service.js", () => ({
  findUserByFirebaseUid
}));

describe("Auth update profile validation integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts longer grade and bullet text payloads", async () => {
    const { updateCurrentUser } = await import("../src/contollers/auth.controller.js");

    const user = {
      save: vi.fn().mockResolvedValue(undefined),
      education: [],
      educationEntries: [],
      skillSections: [],
      skillLanguages: [],
      skillFrameworks: [],
      skillTools: [],
      skillLibraries: [],
      experience: [],
      achievements: []
    };

    findUserByFirebaseUid.mockResolvedValue(user);

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.auth = { uid: "firebase_uid_1" };
      req.user = user;
      next();
    });
    app.patch("/api/v1/auth/me", updateCurrentUser);

    const longGrade = "CGPA: 9.24/10 (Top 3% of batch, Dean's list for 4 semesters)";
    const longBullet = "Built and led a full-stack internship project integrating analytics dashboards, CI/CD pipelines, and role-based workflows to reduce release time and improve reliability across multiple teams.";

    const response = await request(app)
      .patch("/api/v1/auth/me")
      .send({
        educationEntries: [
          {
            degree: "B.Tech",
            specialization: "Computer Science",
            college: "ABC College",
            location: "Noida",
            endDate: "2025",
            grade: longGrade
          }
        ],
        experience: [
          {
            role: "Software Engineer Intern",
            company: "XYZ Labs",
            location: "Remote",
            date: "Jan 2025 - Jun 2025",
            bullets: [longBullet]
          }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(user.educationEntries[0].grade).toBe(longGrade);
    expect(user.experience[0].bullets[0]).toBe(longBullet);
    expect(user.save).toHaveBeenCalledTimes(1);
  });
});
