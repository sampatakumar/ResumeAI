import { Project } from "../models/project.models.js";
import { Resume } from "../models/resume.models.js";
import { Portfolio } from "../models/portfolio.models.js";
import {
  ensureHttpsUrl,
  normalizeCloudflarePagesDeploymentUrl
} from "../services/deployToCloudflare.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const user = req.user;

  const projectCount = await Project.countDocuments({ owner: user._id });
  const resumeCount = await Resume.countDocuments({ owner: user._id });
  const portfolioCount = await Portfolio.countDocuments({ userId: user._id });

  const latestPortfolio = await Portfolio.findOne({ userId: user._id }).sort({ updatedAt: -1 }).lean();
  const normalizedPortfolioUrl = latestPortfolio
    ? normalizeCloudflarePagesDeploymentUrl(latestPortfolio.url, latestPortfolio.projectName)
    : "";
  const normalizedCustomDomain = latestPortfolio?.customDomain
    ? ensureHttpsUrl(latestPortfolio.customDomain)
    : "";

  const recentResumes = await Resume.find({ owner: user._id })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select("title updatedAt");

  const recentActivity = [
    ...(latestPortfolio?.url
      ? [
          {
            action: "Published portfolio",
            target: normalizedCustomDomain || normalizedPortfolioUrl || latestPortfolio.projectName,
            time: latestPortfolio.publishedAt || latestPortfolio.updatedAt || new Date()
          }
        ]
      : []),
    ...recentResumes.map((resume) => ({
      action: "Updated resume",
      target: resume.title,
      time: resume.updatedAt
    }))
  ];

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          projects: projectCount,
          resumes: resumeCount,
          tailoredVersions: resumeCount,
          portfolios: portfolioCount,
          viewsThisWeek: 0
        },
        activePortfolio: latestPortfolio
          ? {
              url: normalizedPortfolioUrl,
              customDomain: normalizedCustomDomain,
              projectName: latestPortfolio.projectName || "",
              publishedAt: latestPortfolio.publishedAt || null
            }
          : null,
        recentActivity
      },
      "Dashboard summary fetched successfully"
    )
  );
});

export const getFullProfileSnapshot = asyncHandler(async (req, res) => {
  const user = req.user;

  const projects = await Project.find({ owner: user._id }).sort({ updatedAt: -1 }).lean();

  const allSkills = [
    ...(user.skillLanguages || []),
    ...(user.skillFrameworks || []),
    ...(user.skillTools || []),
    ...(user.skillLibraries || []),
    ...((user.skillSections || []).flatMap((section) => section.skills || []))
  ];

  const uniqueSkills = [...new Set(allSkills.map((skill) => String(skill || "").trim()).filter(Boolean))];

  const socialProfiles = {
    linkedIn: {
      value: user.linkedInUrl || "",
      url: user.linkedInUrl || ""
    },
    github: {
      value: user.githubUrl || "",
      url: user.githubUrl || ""
    },
    leetCode: {
      value: user.leetCodeId || "",
      url: user.leetCodeId ? `https://leetcode.com/${user.leetCodeId}` : ""
    },
    geeksForGeeks: {
      value: user.geeksForGeeksId || "",
      url: user.geeksForGeeksId ? `https://www.geeksforgeeks.org/user/${user.geeksForGeeksId}` : ""
    }
  };

  const normalizedSkillSections = (user.skillSections || []).map((section, index) => ({
    id: `skill-section-${index + 1}`,
    title: section.title || "",
    skills: section.skills || [],
    skillCount: (section.skills || []).length
  }));

  const normalizedExperience = (user.experience || []).map((item, index) => ({
    id: `experience-${index + 1}`,
    role: item.role || "",
    company: item.company || "",
    location: item.location || "",
    date: item.date || "",
    bullets: item.bullets || [],
    bulletCount: (item.bullets || []).length
  }));

  const normalizedAchievements = (user.achievements || []).map((item, index) => ({
    id: `achievement-${index + 1}`,
    title: item.title || "",
    date: item.date || "",
    bullets: item.bullets || [],
    bulletCount: (item.bullets || []).length
  }));

  const normalizedEducationEntries = (user.educationEntries || []).map((entry, index) => ({
    id: `education-${index + 1}`,
    degree: entry.degree || "",
    specialization: entry.specialization || "",
    college: entry.college || "",
    location: entry.location || "",
    endDate: entry.endDate || "",
    grade: entry.grade || ""
  }));

  const normalizedProjects = projects.map((project) => ({
    id: project._id,
    title: project.title || "",
    description: project.description || "",
    stack: project.stack || [],
    metadata: {
      source: project.source || "manual",
      date: project.date || "",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    links: {
      github: project.githubUrl || "",
      demo: project.demoUrl || ""
    },
    readme: {
      originalName: project.readmeOriginalName || "",
      hasContent: Boolean(project.readmeContent),
      contentLength: project.readmeContent ? project.readmeContent.length : 0
    }
  }));

  const profile = {
    basic: {
      userId: user._id,
      firebaseUid: user.firebaseUid,
      name: user.displayName || "",
      phone: user.phone || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    },
    about: {
      summary: user.about || ""
    },
    socialProfiles,
    education: {
      summary: user.education || [],
      entries: normalizedEducationEntries,
      counts: {
        summaryLines: (user.education || []).length,
        structuredEntries: normalizedEducationEntries.length
      }
    },
    skills: {
      all: uniqueSkills,
      sections: normalizedSkillSections,
      categories: {
        languages: user.skillLanguages || [],
        frameworks: user.skillFrameworks || [],
        tools: user.skillTools || [],
        libraries: user.skillLibraries || []
      },
      counts: {
        uniqueSkills: uniqueSkills.length,
        sectionCount: normalizedSkillSections.length
      }
    },
    experience: {
      entries: normalizedExperience,
      count: normalizedExperience.length
    },
    achievements: {
      entries: normalizedAchievements,
      count: normalizedAchievements.length
    },
    settings: {
      customDomain: user.customDomain || "",
      notificationsEnabled: user.notificationsEnabled
    },
    projects: {
      items: normalizedProjects,
      count: normalizedProjects.length
    },
    counts: {
      projects: normalizedProjects.length,
      experience: normalizedExperience.length,
      achievements: normalizedAchievements.length,
      skills: uniqueSkills.length
    }
  };

  return res
    .status(200)
    .json(new ApiResponse(200, { profile }, "Full profile snapshot fetched successfully"));
});
