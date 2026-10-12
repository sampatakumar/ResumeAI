import { describe, expect, it } from "vitest";
import { calculateAtsReadiness, serializeResume } from "../src/services/resume-copilot.service.js";

describe("Resume Copilot scoring", () => {
  it("produces a bounded ATS readiness estimate for a structured resume", () => {
    const resumeText = [
      "Alex Developer alex@example.com +91 9876543210",
      "Professional Summary",
      "Full-stack developer building React and Node.js applications.",
      "Education",
      "Bachelor of Engineering in Computer Science",
      "Projects",
      "Smart Skill Hub: Developed a learning platform using React, Node.js and MongoDB.",
      "Reduced API response time by 30% in local tests.",
      "Skills",
      "JavaScript, React, Node.js, MongoDB, Docker"
    ].join("\n");
    const result = calculateAtsReadiness({ resumeText, jobRole: "Full-Stack Developer" });
    expect(result.atsReadinessScore).toBeGreaterThanOrEqual(0);
    expect(result.atsReadinessScore).toBeLessThanOrEqual(100);
    expect(result.jobRole).toBe("Full-Stack Developer");
    expect(result.roleKeywordMatch).not.toBeNull();
    expect(result.scoreType).toBe("heuristic_estimate");
    expect(result.sections).toHaveProperty("structure");
  });

  it("does not require a target job role", () => {
    const result = calculateAtsReadiness({ resumeText: "Education\nSkills\nProjects" });
    expect(result.jobRole).toBeNull();
    expect(result.roleKeywordMatch).toBeNull();
    expect(result.atsReadinessScore).toBeGreaterThanOrEqual(0);
  });

  it("serializes current structured draft fields for AI context", () => {
    const text = serializeResume({
      name: "Alex",
      professionalSummary: "Full-stack developer",
      projects: [{ name: "Demo", bullets: ["Built an API"] }],
      skillSections: [{ title: "Technical", skills: ["React", "Node.js"] }]
    });
    expect(text).toContain("Alex");
    expect(text).toContain("Full-stack developer");
    expect(text).toContain("Built an API");
    expect(text).toContain("React");
  });
});
