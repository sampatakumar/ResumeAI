import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserByFirebaseUid = vi.fn();
const projectFind = vi.fn();

vi.mock("../src/services/user.service.js", () => ({
  findUserByFirebaseUid
}));

vi.mock("../src/models/project.models.js", () => ({
  Project: {
    find: projectFind
  }
}));

describe("Dashboard profile snapshot integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a structured full profile payload", async () => {
    const { getFullProfileSnapshot } = await import("../src/contollers/dashboard.controller.js");

    const user = {
      _id: "u1",
      firebaseUid: "firebase_u1",
      displayName: "Sampatakumar",
      email: "sampatakumar@gmail.com",
      photoURL: "",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      updatedAt: new Date("2026-01-02T10:00:00.000Z"),
      lastLoginAt: new Date("2026-01-03T10:00:00.000Z"),
      linkedInUrl: "https://linkedin.com/in/sampatakumar",
      githubUrl: "https://github.com/sampatakumar",
      leetCodeId: "sampatakumar-lc",
      geeksForGeeksId: "sampatakumar-gfg",
      education: ["B.Tech - ABC College"],
      educationEntries: [{ degree: "B.Tech", college: "ABC College" }],
      skillLanguages: ["JavaScript", "TypeScript"],
      skillFrameworks: ["React"],
      skillTools: ["Git"],
      skillLibraries: ["Express"],
      skillSections: [{ title: "Core", skills: ["Node.js"] }],
      experience: [{ role: "Developer", company: "XYZ" }],
      achievements: [{ title: "Hackathon Winner" }],
      customDomain: "praveen.dev",
      notificationsEnabled: true
    };

    findUserByFirebaseUid.mockResolvedValue(user);

    projectFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: "p1", title: "ResumeAI" }])
      })
    });

    const app = express();
    app.use((req, _res, next) => {
      req.auth = { uid: "firebase_u1" };
      req.user = user;
      next();
    });
    app.get("/api/v1/dashboard/profile", getFullProfileSnapshot);

    const response = await request(app).get("/api/v1/dashboard/profile");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.profile.basic.name).toBe("Sampatakumar");
    expect(response.body.data.profile.socialProfiles.github.url).toBe("https://github.com/sampatakumar");
    expect(response.body.data.profile.projects.items).toHaveLength(1);
    expect(response.body.data.profile.resumes).toBeUndefined();
    expect(response.body.data.profile.tailoredResumes).toBeUndefined();
    expect(response.body.data.profile.portfolio).toBeUndefined();
    expect(response.body.data.profile.counts.projects).toBe(1);
    expect(response.body.data.profile.counts.experience).toBe(1);
    expect(response.body.data.profile.counts.achievements).toBe(1);
    expect(response.body.data.profile.counts.hasPortfolio).toBeUndefined();
    expect(response.body.data.profile.skills.all).toContain("Node.js");
  });
});
