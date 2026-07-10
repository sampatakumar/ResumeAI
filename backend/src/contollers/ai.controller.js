import { z } from "zod";
import {
  expandProjectBullet,
  generateAtsDescriptionBullets,
  generateProfileSummary,
  generateTailoredResume,
  parseResumeWithLLM
} from "../services/groq.service.js";
import {
  extractJdRequirementsWithLangChain,
  optimizeSkillsAndProjectsWithLangChain
} from "../services/langchain-tailor.service.js";
import {
  extractFocusedResumeSections,
  extractNormalizedSkills,
  extractResumeLinksFromUploadedResume,
  extractRawTextFromUploadedResume,
  extractResumeRawText
} from "../services/resume-extraction.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { Resume } from "../models/resume.models.js";
import { Project } from "../models/project.models.js";
import {
  AchievementEntry,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  normalizeSkillBuckets,
  normalizeTextArray,
  SkillSection
} from "../classes/profile.classes.js";

const tailorSchema = z.object({
  jobDescription: z.string().min(20, "jobDescription must be at least 20 characters"),
  resumeText: z.string().min(20, "resumeText must be at least 20 characters"),
  tone: z.enum(["professional", "confident", "concise"]).optional(),
  maxBullets: z.number().int().min(3).max(12).optional()
});

const matchMasterDataSchema = z.object({
  resumeId: z.string().min(1, "resumeId is required"),
  jobDescription: z.string().optional().default(""),
  jdRequirements: z
    .object({
      primaryTechStack: z.array(z.string()).optional().default([]),
      secondarySkills: z.array(z.string()).optional().default([]),
      coreResponsibilities: z.array(z.string()).optional().default([]),
      atsKeywords: z.array(z.string()).optional().default([]),
      seniority: z.string().optional().default(""),
      roleTitle: z.string().optional().default("")
    })
    .optional()
    .default({})
});

const expandProjectBulletSchema = z.object({
  bullet: z.string().min(8, "bullet must be at least 8 characters"),
  projectName: z.string().max(180).optional().default(""),
  technologies: z.string().max(300).optional().default(""),
  atsOptimized: z.boolean().optional().default(false),
  maxLines: z.number().int().min(1).max(30).optional().default(2)
});

const generateProfileSummarySchema = z.object({
  tone: z.enum(["professional", "confident", "concise", "friendly"]).optional().default("professional"),
  maxWords: z.number().int().min(40).max(180).optional().default(90),
  skills: z.array(z.string()).optional(),
  educationLines: z.array(z.string()).optional(),
  achievements: z.array(z.object({
    title: z.string().optional().default(""),
    date: z.string().optional().default(""),
    bullets: z.array(z.string()).optional().default([])
  })).optional(),
  projects: z.array(z.object({
    title: z.string().optional().default(""),
    description: z.string().optional().default(""),
    stack: z.union([z.string(), z.array(z.string())]).optional(),
    date: z.string().optional().default("")
  })).optional()
});

const generateDescriptionBulletsSchema = z.object({
  prompt: z.string().min(8, "prompt must be at least 8 characters"),
  context: z.string().max(3000).optional().default(""),
  tone: z.enum(["professional", "confident", "concise"]).optional().default("professional"),
  count: z.number().int().min(1).max(6).optional().default(3)
});

const nullableString = z.union([z.string(), z.null(), z.undefined()]).transform(val => val || "");
const nullableStringArray = z.union([z.array(z.string()), z.null(), z.undefined()]).transform(val => {
  if (!Array.isArray(val)) return [];
  return val.filter(item => typeof item === "string");
});

const llmParsedResumeSchema = z.object({
  profile: z.object({
    displayName: nullableString,
    headline: nullableString,
    phone: nullableString,
    about: nullableString
  }).catch({ displayName: "", headline: "", phone: "", about: "" }).default({}),
  preferences: z.object({
    linkedInUrl: nullableString,
    githubUrl: nullableString
  }).catch({ linkedInUrl: "", githubUrl: "" }).default({}),
  contact: z.object({
    email: nullableString
  }).catch({ email: "" }).default({}),
  educationEntries: z.array(z.object({
    degree: nullableString,
    specialization: nullableString,
    college: nullableString,
    location: nullableString,
    endDate: nullableString,
    grade: nullableString
  })).catch([]).default([]),
  skillSections: z.array(z.object({
    title: nullableString,
    skills: nullableStringArray
  })).catch([]).default([]),
  experience: z.array(z.object({
    role: nullableString,
    company: nullableString,
    location: nullableString,
    date: nullableString,
    bullets: nullableStringArray
  })).catch([]).default([]),
  projects: z.array(z.object({
    title: nullableString,
    description: nullableString,
    stack: nullableString,
    date: nullableString,
    githubUrl: nullableString,
    demoUrl: nullableString
  })).catch([]).default([]),
  achievements: z.array(z.object({
    title: nullableString,
    date: nullableString,
    bullets: nullableStringArray
  })).catch([]).default([])
}).catch({
  profile: { displayName: "", headline: "", phone: "", about: "" },
  preferences: { linkedInUrl: "", githubUrl: "" },
  contact: { email: "" },
  educationEntries: [],
  skillSections: [],
  experience: [],
  projects: [],
  achievements: []
});

const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeText = (value) => (value || "").toString().trim();

const uniqueStrings = (items = []) => Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean)));

const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,5}[\s-]?\d{3,5}/;
const linkedInRegex = /https?:\/\/(?:www\.)?linkedin\.com\/[A-Za-z0-9\-_/?.=&%#]+/i;
const githubRegex = /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9\-_/?.=&%#]+/i;


const normalizeExtractedLinks = (links = []) =>
  uniqueStrings(
    links
      .map((item) => normalizeText(item))
      .map((item) => item.replace(/[).,;]+$/, ""))
      .filter(Boolean)
  );

const isGithubProfileLink = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  const match = normalized.match(/^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)(?:[/?#].*)?$/i);
  if (!match?.[1]) {
    return false;
  }
  const remainingPath = normalized.replace(/^https?:\/\/(?:www\.)?github\.com\/[^/?#]+/i, "");
  return !remainingPath || remainingPath === "/" || remainingPath.startsWith("?") || remainingPath.startsWith("#");
};

const pickProfileLinksFromExtractedLinks = (links = []) => {
  const normalized = normalizeExtractedLinks(links);
  const httpLinks = normalized.filter((link) => /^https?:\/\//i.test(link));
  const mailtoLink = normalized.find((link) => /^mailto:/i.test(link)) || "";
  const emailFromMailto = normalizeText(mailtoLink.replace(/^mailto:/i, ""));

  const linkedInUrl = httpLinks.find((link) => linkedInRegex.test(link)) || "";
  const githubUrl = httpLinks.find((link) => isGithubProfileLink(link)) || "";
  const projectGithubLinks = httpLinks.filter((link) => githubRegex.test(link) && !isGithubProfileLink(link));
  const liveLinks = httpLinks.filter((link) => !linkedInRegex.test(link) && !githubRegex.test(link));

  return {
    linkedInUrl,
    githubUrl,
    emailFromMailto,
    projectGithubLinks,
    liveLinks
  };
};



const collectSkillValues = (skills) => {
  if (!skills || typeof skills !== "object") {
    return [];
  }

  return [skills.languages, skills.frameworks, skills.tools, skills.libraries]
    .flat()
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const collectUserSkillValues = (user) => {
  const normalizedSkillBuckets = normalizeSkillBuckets({
    skillSections: user.skillSections,
    skillLanguages: user.skillLanguages,
    skillFrameworks: user.skillFrameworks,
    skillTools: user.skillTools,
    skillLibraries: user.skillLibraries
  });

  const sectionSkills = normalizedSkillBuckets.skillSections.flatMap((section) => section.skills || []);

  return [
    normalizedSkillBuckets.skillLanguages,
    normalizedSkillBuckets.skillFrameworks,
    normalizedSkillBuckets.skillTools,
    normalizedSkillBuckets.skillLibraries,
    sectionSkills
  ]
    .flat()
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const collectUserSkillSections = (user) => {
  return SkillSection.fromList(user.skillSections)
    .filter((section) => !section.isEmpty())
    .map((section) => section.toObject());
};

const collectStructuredExperienceBlocks = (user, fallbackStructuredResume) => {
  const userExperiences = ExperienceEntry.fromList(user.experience)
    .filter((item) => !item.isEmpty())
    .map((item) => item.toObject());

  if (userExperiences.length) {
    return userExperiences.map((item, index) => formatRecommendedExperience(item, `user-experience-${index}`));
  }

  return Array.isArray(fallbackStructuredResume?.experience)
    ? fallbackStructuredResume.experience.map((item, index) => formatRecommendedExperience(item, `resume-experience-${index}`))
    : [];
};

const collectStructuredAchievementBlocks = (user, fallbackStructuredResume) => {
  const userAchievements = AchievementEntry.fromList(user.achievements)
    .filter((item) => !item.isEmpty())
    .map((item) => item.toObject());

  if (userAchievements.length) {
    return userAchievements.map((item, index) => formatRecommendedAchievement(item, `user-achievement-${index}`));
  }

  return Array.isArray(fallbackStructuredResume?.achievements)
    ? fallbackStructuredResume.achievements.map((item, index) => formatRecommendedAchievement(item, `resume-achievement-${index}`))
    : [];
};

const toTextBlock = (label, items) => {
  if (!items.length) {
    return `${label}: N/A`;
  }

  return [label + ":", ...items.map((item) => `- ${item}`)].join("\n");
};

const buildAchievementText = (achievement) => {
  const headline = [achievement.title, achievement.date].filter(Boolean).join(" | ");
  const bullets = Array.isArray(achievement.bullets) ? achievement.bullets : [];
  return [headline, ...bullets.map((bullet) => `  - ${bullet}`)].filter(Boolean).join("\n");
};

const buildProfileSummarySource = ({
  user,
  normalizedSkills,
  educationLines,
  achievements,
  projects
}) => {
  const nameLine = normalizeText(user.displayName) || "Candidate";
  const aboutLine = normalizeText(user.about);
  const projectLines = projects.map((project) => {
    return [project.title, project.description, (project.stack || []).join(", ")].filter(Boolean).join(" | ");
  });

  const achievementLines = achievements.map((achievement) => buildAchievementText(achievement));

  return [
    `Name: ${nameLine}`,
    aboutLine ? `Existing Summary: ${aboutLine}` : "Existing Summary: N/A",
    toTextBlock("Skills", normalizedSkills),
    toTextBlock("Education", educationLines),
    toTextBlock("Achievements", achievementLines),
    toTextBlock("Projects", projectLines)
  ].join("\n\n");
};

const getResumeStructuredData = async (resume) => {
  const parsedContent = safeJsonParse(resume.content);
  if (parsedContent && typeof parsedContent === "object") {
    return {
      name: normalizeText(parsedContent.name),
      email: normalizeText(parsedContent.email),
      phone: normalizeText(parsedContent.phone),
      linkedin: normalizeText(parsedContent.linkedin),
      github: normalizeText(parsedContent.github),
      education: Array.isArray(parsedContent.education) ? parsedContent.education : [],
      experience: Array.isArray(parsedContent.experience) ? parsedContent.experience : [],
      projects: Array.isArray(parsedContent.projects) ? parsedContent.projects : [],
      achievements: Array.isArray(parsedContent.achievements) ? parsedContent.achievements : [],
      skills: parsedContent.skills && typeof parsedContent.skills === "object" ? parsedContent.skills : {}
    };
  }

  const extractedText = await extractResumeRawText(resume);
  const focusedSections = extractFocusedResumeSections(extractedText || "");

  return {
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    education: [],
    experience: focusedSections.experienceText
      ? focusedSections.experienceText
          .split(/\n+/)
          .map((item) => ({ role: item, company: "", location: "", date: "", bullets: [] }))
      : [],
    projects: focusedSections.projectsText
      ? focusedSections.projectsText
          .split(/\n+/)
          .map((item) => ({ name: item, technologies: "", date: "", bullets: [] }))
      : [],
    achievements: focusedSections.achievementsText
      ? focusedSections.achievementsText
          .split(/\n+/)
          .map((item) => ({ title: item, date: "", bullets: [] }))
      : [],
    skills: { languages: extractNormalizedSkills(focusedSections.skillsText) }
  };
};

const jdStopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "you",
  "your",
  "will",
  "must",
  "should",
  "years",
  "year",
  "experience",
  "developer",
  "engineer",
  "team",
  "role",
  "work"
]);

const tokenizeForMatching = (value) => {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !jdStopWords.has(token));
};

const extractJobKeywords = (jobDescription) => {
  const frequency = new Map();
  for (const token of tokenizeForMatching(jobDescription)) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([token]) => token);
};

const scoreSkillForJd = (skill, jdKeywords) => {
  const skillTokens = new Set(tokenizeForMatching(skill));
  let score = 0;
  for (const keyword of jdKeywords) {
    if (skillTokens.has(keyword)) {
      score += 1;
    }
  }
  return score;
};

const buildJdResumeComment = ({ jdKeywords, skills = [], projects = [], experiences = [], achievements = [] }) => {
  const topKeywords = jdKeywords.slice(0, 8);
  const strongSkillMatches = skills.filter((item) => (item.relevanceScore || 0) > 0).slice(0, 5).map((item) => item.label);
  const strongProjects = projects.filter((item) => (item.relevanceScore || 0) > 0).slice(0, 3).map((item) => item.title);
  const strongExperiences = experiences.filter((item) => (item.relevanceScore || 0) > 0).slice(0, 3).map((item) => item.role || item.company);
  const strongAchievements = achievements.filter((item) => (item.relevanceScore || 0) > 0).slice(0, 3).map((item) => item.title);

  return [
    topKeywords.length
      ? `JD highlights: ${topKeywords.join(", ")}.`
      : "JD highlights are limited; broad saved profile relevance was used.",
    strongSkillMatches.length
      ? `Best matching skills from your saved profile: ${strongSkillMatches.join(", ")}.`
      : "Skills match is currently weak; you can manually select additional relevant skills.",
    strongProjects.length
      ? `Most relevant saved projects: ${strongProjects.join(" | ")}.`
      : "No strong project match found automatically; consider selecting alternate projects manually.",
    strongExperiences.length || strongAchievements.length
      ? `Experience/Achievement evidence selected: ${[...strongExperiences, ...strongAchievements].filter(Boolean).slice(0, 4).join(" | ")}.`
      : "Experience and achievements need more JD-aligned evidence; manual selections are recommended.",
    "You can unselect AI picks and choose any saved item before generating the final resume."
  ];
};

const scoreProjectForJd = (project, jdKeywords) => {
  const projectText = [project.name || project.title, project.description, project.technologies, ...(project.stack || []), ...(project.bullets || [])].join(" ");
  const projectTokens = new Set(tokenizeForMatching(projectText));

  let score = 0;
  for (const keyword of jdKeywords) {
    if (projectTokens.has(keyword)) {
      score += 1;
    }
  }

  return score;
};

const scoreExperienceForJd = (experience, jdKeywords) => {
  const experienceText = [experience.role, experience.company, experience.location, experience.date, ...(experience.bullets || [])].join(" ");
  const tokens = new Set(tokenizeForMatching(experienceText));
  let score = 0;
  for (const keyword of jdKeywords) {
    if (tokens.has(keyword)) {
      score += 1;
    }
  }
  return score;
};

const scoreAchievementForJd = (achievement, jdKeywords) => {
  const achievementText = [achievement.title, achievement.date, ...(achievement.bullets || [])].join(" ");
  const tokens = new Set(tokenizeForMatching(achievementText));
  let score = 0;
  for (const keyword of jdKeywords) {
    if (tokens.has(keyword)) {
      score += 1;
    }
  }
  return score;
};

const rankProjectsForJd = (projects, jdKeywords) => {
  return projects
    .map((project) => ({ project, score: scoreProjectForJd(project, jdKeywords) }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return new Date(b.project.updatedAt).getTime() - new Date(a.project.updatedAt).getTime();
    });
};

const pickTopProjectsForJd = (projects, jdKeywords) => {
  const ranked = rankProjectsForJd(projects, jdKeywords);
  const positive = ranked.filter((item) => item.score > 0).slice(0, 3);
  return positive.length === 3 ? positive : ranked.slice(0, 3);
};

const recommendSkillsForJd = ({ normalizedSkills, projects, jdKeywords }) => {
  const jdKeywordSet = new Set(jdKeywords);
  const candidates = [
    ...normalizedSkills,
    ...projects.flatMap((project) => project.stack || [])
  ]
    .map((value) => (value || "").trim())
    .filter(Boolean);

  const uniqueCandidates = Array.from(new Set(candidates));
  const prioritized = [];
  const fallback = [];

  for (const skill of uniqueCandidates) {
    const skillTokens = tokenizeForMatching(skill);
    const matched = skillTokens.some((token) => jdKeywordSet.has(token));
    if (matched) {
      prioritized.push(skill);
    } else {
      fallback.push(skill);
    }
  }

  return [...prioritized, ...fallback].slice(0, 14);
};

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value)));

const computeKeywordCoveragePercent = (keywords = [], corpusValues = []) => {
  const uniqueKeywords = uniqueStrings(keywords);
  if (!uniqueKeywords.length) {
    return 0;
  }

  const corpusTokens = new Set(tokenizeForMatching((corpusValues || []).join(" ")));
  let matched = 0;

  for (const keyword of uniqueKeywords) {
    const keywordTokens = tokenizeForMatching(keyword);
    if (!keywordTokens.length) {
      continue;
    }
    if (keywordTokens.some((token) => corpusTokens.has(token))) {
      matched += 1;
    }
  }

  return (matched / uniqueKeywords.length) * 100;
};

const toSuggestedProjectTitle = (skills = []) => {
  const normalized = uniqueStrings(skills).slice(0, 3);
  if (!normalized.length) {
    return "DevOps Portfolio Project";
  }
  return `${normalized.join(" + ")} Implementation Project`;
};

const buildMatchInsights = ({
  jdAnalysis,
  jdKeywords,
  normalizedSkills,
  selectedProjects,
  selectedExperiences,
  selectedAchievements,
  optimizedSkills,
  optimizedProjects,
  rankedProjects
}) => {
  const jdSkillTargets = uniqueStrings([
    ...(jdAnalysis?.primaryTechStack || []),
    ...(jdAnalysis?.secondarySkills || [])
  ]);

  const sourceSkillValues = uniqueStrings([
    ...(normalizedSkills || []),
    ...(selectedProjects || []).flatMap((project) => project.stack || [])
  ]);

  const optimizedSkillValues = uniqueStrings([
    ...(optimizedSkills?.finalOrdered || []),
    ...(optimizedProjects || []).flatMap((project) => project.stack || [])
  ]);

  const projectCorpus = (selectedProjects || []).flatMap((project) => [
    project.title,
    project.description,
    ...(project.stack || []),
    ...(project.bullets || [])
  ]);
  const experienceCorpus = (selectedExperiences || []).flatMap((item) => [
    item.role,
    item.company,
    item.location,
    ...(item.bullets || [])
  ]);
  const achievementCorpus = (selectedAchievements || []).flatMap((item) => [
    item.title,
    ...(item.bullets || [])
  ]);

  const optimizedProjectCorpus = (optimizedProjects || []).flatMap((project) => [
    project.title,
    project.description,
    ...(project.stack || []),
    ...(project.bullets || [])
  ]);

  const currentBreakdown = {
    skills: clampPercent(computeKeywordCoveragePercent(jdSkillTargets, sourceSkillValues)),
    projects: clampPercent(computeKeywordCoveragePercent(jdKeywords, projectCorpus)),
    experience: clampPercent(computeKeywordCoveragePercent(jdKeywords, experienceCorpus)),
    achievements: clampPercent(computeKeywordCoveragePercent(jdKeywords, achievementCorpus))
  };

  const immediateProjectedBreakdown = {
    skills: clampPercent(computeKeywordCoveragePercent(jdSkillTargets, optimizedSkillValues)),
    projects: clampPercent(computeKeywordCoveragePercent(jdKeywords, optimizedProjectCorpus)),
    experience: currentBreakdown.experience,
    achievements: currentBreakdown.achievements
  };

  const weighted = (breakdown) =>
    breakdown.skills * 0.35 + breakdown.projects * 0.35 + breakdown.experience * 0.2 + breakdown.achievements * 0.1;

  const currentMatchPercent = clampPercent(weighted(currentBreakdown));

  const sourceTokens = new Set(tokenizeForMatching(sourceSkillValues.join(" ")));
  const missingSkills = jdSkillTargets.filter((skill) => {
    const tokens = tokenizeForMatching(skill);
    return !tokens.some((token) => sourceTokens.has(token));
  });

  const matchedKeywords = jdKeywords.filter((keyword) => {
    const projectTokens = new Set(tokenizeForMatching(projectCorpus.join(" ")));
    const experienceTokens = new Set(tokenizeForMatching(experienceCorpus.join(" ")));
    return projectTokens.has(keyword) || experienceTokens.has(keyword);
  });

  const missingKeywords = jdKeywords.filter((keyword) => !matchedKeywords.includes(keyword)).slice(0, 12);

  const topProjects = (rankedProjects || []).slice(0, 2);
  const keyGapSkills = missingSkills.slice(0, 4);

  const existingProjectUpgradeSuggestions = topProjects.map((project) => ({
    projectId: project.id,
    projectTitle: project.title,
    suggestions: keyGapSkills.length
      ? keyGapSkills.map((skill) => `Add a practical ${skill} module in ${project.title} with measurable deployment/testing evidence.`)
      : ["Add stronger deployment automation and observability evidence to improve JD fit."]
  }));

  const newProjectSuggestions = [
    {
      title: toSuggestedProjectTitle(keyGapSkills),
      focusSkills: keyGapSkills,
      rationale: "Bridges missing JD skills with one end-to-end demonstrable project."
    },
    {
      title: "CI/CD + Monitoring Pipeline Showcase",
      focusSkills: uniqueStrings([
        ...missingSkills.filter((skill) => /jenkins|ci|cd|pipeline/i.test(skill)).slice(0, 2),
        ...missingSkills.filter((skill) => /docker|kubernetes|terraform|ansible|prometheus|grafana|linux|aws|gcp|azure/i.test(skill)).slice(0, 3)
      ]),
      rationale: "Demonstrates deployment, reliability, and monitoring capabilities expected in DevOps roles."
    }
  ].filter((item) => item.focusSkills.length);

  const suggestionSkillUplift = Math.min(45, missingSkills.slice(0, 6).length * 8);
  const suggestionProjectUplift = Math.min(35, missingKeywords.slice(0, 8).length * 4);

  const suggestionProjectedBreakdown = {
    skills: clampPercent(currentBreakdown.skills + suggestionSkillUplift),
    projects: clampPercent(currentBreakdown.projects + suggestionProjectUplift),
    experience: currentBreakdown.experience,
    achievements: currentBreakdown.achievements
  };

  const projectedBreakdown = {
    skills: Math.max(immediateProjectedBreakdown.skills, suggestionProjectedBreakdown.skills),
    projects: Math.max(immediateProjectedBreakdown.projects, suggestionProjectedBreakdown.projects),
    experience: Math.max(immediateProjectedBreakdown.experience, suggestionProjectedBreakdown.experience),
    achievements: Math.max(immediateProjectedBreakdown.achievements, suggestionProjectedBreakdown.achievements)
  };

  const projectedMatchPercent = clampPercent(Math.max(currentMatchPercent, weighted(projectedBreakdown)));

  return {
    currentMatchPercent,
    projectedMatchPercent,
    breakdown: {
      current: currentBreakdown,
      projected: projectedBreakdown
    },
    matchedKeywords: uniqueStrings(matchedKeywords).slice(0, 12),
    missingKeywords,
    missingSkills: missingSkills.slice(0, 12),
    existingProjectUpgradeSuggestions,
    newProjectSuggestions,
    gapSummary: [
      `Current JD match is approximately ${currentMatchPercent}%.`,
      missingSkills.length
        ? `Key missing skills: ${missingSkills.slice(0, 6).join(", ")}.`
        : "Core JD skills are present in current profile data.",
      `If you implement suggested updates, projected match can reach about ${projectedMatchPercent}%.`
    ]
  };
};

const rankStructuredItems = (items, scorer) => {
  return items
    .map((item, index) => ({
      ...item,
      id: item.id || String(index),
      relevanceScore: scorer(item)
    }))
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      return String(a.id).localeCompare(String(b.id));
    });
};

const formatRecommendedProject = (project) => {
  const normalized = ProjectEntry.from(project).toObject();

  return {
    id: String(project._id || project.id || ""),
    title: normalized.title,
    description: normalized.description,
    stack: normalized.stack,
    date: normalized.date,
    githubUrl: normalized.githubUrl,
    demoUrl: normalized.demoUrl
  };
};

const formatRecommendedExperience = (experience, id) => ({
  id,
  role: experience.role || "",
  company: experience.company || "",
  location: experience.location || "",
  date: experience.date || "",
  bullets: Array.isArray(experience.bullets) ? experience.bullets : []
});

const formatRecommendedAchievement = (achievement, id) => ({
  id,
  title: achievement.title || "",
  date: achievement.date || "",
  bullets: Array.isArray(achievement.bullets) ? achievement.bullets : []
});

const extractJdKeywordsFromRequirements = (jdRequirements = {}, fallbackJobDescription = "") => {
  const requirementKeywords = [
    ...(jdRequirements.primaryTechStack || []),
    ...(jdRequirements.secondarySkills || []),
    ...(jdRequirements.coreResponsibilities || []),
    ...(jdRequirements.atsKeywords || []),
    jdRequirements.roleTitle || "",
    jdRequirements.seniority || ""
  ]
    .join(" ")
    .trim();

  const source = requirementKeywords || fallbackJobDescription;
  return extractJobKeywords(source);
};

const toSelectedProjectsForTransformer = (projects = [], selectedIds = []) => {
  const selectedSet = new Set((selectedIds || []).map((item) => String(item || "").trim()).filter(Boolean));
  return projects
    .filter((project) => selectedSet.has(String(project.id || "")))
    .map((project) => ({
      id: String(project.id || ""),
      title: project.title || "",
      description: project.description || "",
      stack: Array.isArray(project.stack) ? project.stack : [],
      date: project.date || "",
      githubUrl: project.githubUrl || "",
      demoUrl: project.demoUrl || ""
    }));
};

const enrichOptimizedProjectsWithSource = (optimizedProjects = [], sourceProjects = []) => {
  const sourceById = new Map(sourceProjects.map((project) => [String(project.id || ""), project]));

  const normalized = optimizedProjects
    .map((project) => {
      const source = sourceById.get(String(project.id || ""));
      if (!source) {
        return null;
      }

      return {
        id: String(source.id || ""),
        title: project.title || source.title || "",
        description: project.description || source.description || "",
        stack: Array.isArray(source.stack) ? source.stack : [],
        date: project.date || source.date || "",
        githubUrl: project.githubUrl || source.githubUrl || "",
        demoUrl: project.demoUrl || source.demoUrl || "",
        bullets: Array.isArray(project.bullets) ? project.bullets : []
      };
    })
    .filter(Boolean);

  return normalized.length ? normalized : sourceProjects;
};

export const tailorResume = asyncHandler(async (req, res) => {
  const parsed = tailorSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid AI tailor payload", parsed.error.issues);
  }

  let tailoredText = "";

  try {
    tailoredText = await generateTailoredResume(parsed.data);
  } catch (error) {
    throw new ApiError(502, error instanceof Error ? error.message : "AI provider request failed");
  }

  if (!tailoredText) {
    throw new ApiError(502, "AI provider returned an empty response");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tailoredText,
        metadata: {
          provider: "groq",
          model: env.GROQ_MODEL
        }
      },
      "Resume tailored successfully"
    )
  );
});

export const generateUserProfileSummary = asyncHandler(async (req, res) => {
  const parsed = generateProfileSummarySchema.safeParse(req.body || {});

  if (!parsed.success) {
    throw new ApiError(400, "Invalid profile summary payload", parsed.error.issues);
  }

  const user = req.user;

  const bodySkills = parsed.data.skills;
  const bodyEducation = parsed.data.educationLines;
  const bodyAchievements = parsed.data.achievements;
  const bodyProjects = parsed.data.projects;

  let normalizedSkills;
  if (bodySkills !== undefined) {
    normalizedSkills = uniqueStrings(bodySkills);
  } else {
    const normalizedSkillBuckets = normalizeSkillBuckets({
      skillSections: user.skillSections,
      skillLanguages: user.skillLanguages,
      skillFrameworks: user.skillFrameworks,
      skillTools: user.skillTools,
      skillLibraries: user.skillLibraries
    });
    normalizedSkills = uniqueStrings([
      ...normalizedSkillBuckets.skillLanguages,
      ...normalizedSkillBuckets.skillFrameworks,
      ...normalizedSkillBuckets.skillTools,
      ...normalizedSkillBuckets.skillLibraries,
      ...normalizedSkillBuckets.skillSections.flatMap((section) => section.skills || [])
    ]);
  }

  let educationLines;
  if (bodyEducation !== undefined) {
    educationLines = bodyEducation.filter(Boolean);
  } else {
    educationLines = Array.isArray(user.educationEntries) && user.educationEntries.length
      ? EducationEntry.fromList(user.educationEntries)
          .filter((entry) => !entry.isEmpty())
          .map((entry) => entry.toSummaryLine())
      : normalizeTextArray(user.education);
  }

  let normalizedAchievements;
  if (bodyAchievements !== undefined) {
    normalizedAchievements = bodyAchievements.slice(0, 6);
  } else {
    normalizedAchievements = AchievementEntry.fromList(user.achievements)
      .filter((item) => !item.isEmpty())
      .map((item) => item.toObject())
      .slice(0, 6);
  }

  let normalizedProjects;
  if (bodyProjects !== undefined) {
    normalizedProjects = bodyProjects.map((project) => {
      const stackArr = Array.isArray(project.stack)
        ? project.stack
        : typeof project.stack === "string"
          ? project.stack.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
      return {
        title: project.title || "",
        description: project.description || "",
        stack: stackArr,
        date: project.date || ""
      };
    });
  } else {
    const dbProjects = await Project.find({ owner: user._id }).sort({ updatedAt: -1 }).limit(6).lean();
    normalizedProjects = dbProjects.map((project) => formatRecommendedProject(project));
  }

  if (!normalizedSkills.length && !educationLines.length && !normalizedAchievements.length && !normalizedProjects.length) {
    throw new ApiError(400, "Add at least one skill, education, achievement, or project before generating summary");
  }

  const profileSource = buildProfileSummarySource({
    user,
    normalizedSkills,
    educationLines,
    achievements: normalizedAchievements,
    projects: normalizedProjects
  });

  let profileSummary = "";
  try {
    profileSummary = await generateProfileSummary({
      profileSource,
      tone: parsed.data.tone,
      maxWords: parsed.data.maxWords
    });
  } catch (error) {
    throw new ApiError(502, error instanceof Error ? error.message : "AI provider request failed");
  }

  if (!profileSummary) {
    throw new ApiError(502, "AI provider returned an empty profile summary");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profileSummary,
        metadata: {
          provider: "groq",
          model: env.GROQ_MODEL,
          counts: {
            skills: normalizedSkills.length,
            education: educationLines.length,
            achievements: normalizedAchievements.length,
            projects: normalizedProjects.length
          }
        }
      },
      "Profile summary generated successfully"
    )
  );
});

export const generateDescriptionBullets = asyncHandler(async (req, res) => {
  const parsed = generateDescriptionBulletsSchema.safeParse(req.body || {});

  if (!parsed.success) {
    throw new ApiError(400, "Invalid description generation payload", parsed.error.issues);
  }

  // Keep feature available only for authenticated profiles. We already hydrated req.user in middleware.

  let bullets = [];
  try {
    bullets = await generateAtsDescriptionBullets(parsed.data);
  } catch (error) {
    throw new ApiError(502, error instanceof Error ? error.message : "AI provider request failed");
  }

  if (!bullets.length) {
    throw new ApiError(502, "AI provider returned empty bullet output");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bullets
      },
      "Description bullets generated successfully"
    )
  );
});

export const parseResumeForOnboarding = asyncHandler(async (req, res) => {

  if (!req.file) {
    throw new ApiError(400, "Resume file is required");
  }

  const extractedText = await extractRawTextFromUploadedResume(req.file);
  if (!normalizeText(extractedText)) {
    throw new ApiError(400, "Unable to extract readable text from this resume. Please try a clearer file.");
  }

  const extractedLinks = await extractResumeLinksFromUploadedResume(req.file, extractedText);
  const linkMeta = pickProfileLinksFromExtractedLinks(extractedLinks);

  // Call LLM for parsing
  const rawLlmResponse = await parseResumeWithLLM({ rawText: extractedText, linkMeta });

  let parsedJson = {};
  try {
    parsedJson = JSON.parse(rawLlmResponse);
  } catch (err) {
    parsedJson = {};
  }

  const parsedData = llmParsedResumeSchema.parse(parsedJson);

  // Fallback metadata extracted with regex for higher reliability on contact fields
  const emailRegexMatch = normalizeText(String(extractedText.match(emailRegex)?.[0] || "").toLowerCase());
  const phoneRegexMatch = normalizeText(String(extractedText.match(phoneRegex)?.[0] || ""));

  const email = parsedData.contact?.email || emailRegexMatch || linkMeta.emailFromMailto || "";
  const phone = parsedData.profile?.phone || phoneRegexMatch || "";
  const linkedInUrl = parsedData.preferences?.linkedInUrl || linkMeta.linkedInUrl || "";
  const githubUrl = parsedData.preferences?.githubUrl || linkMeta.githubUrl || "";

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        parsed: {
          profile: {
            displayName: parsedData.profile?.displayName || "",
            headline: parsedData.profile?.headline || "",
            phone,
            about: parsedData.profile?.about || ""
          },
          preferences: {
            linkedInUrl,
            githubUrl
          },
          contact: {
            email
          },
          educationEntries: parsedData.educationEntries,
          skillSections: parsedData.skillSections,
          experience: parsedData.experience,
          projects: parsedData.projects,
          achievements: parsedData.achievements
        },
        extractionMeta: {
          originalFileName: req.file.originalname || "",
          mimeType: req.file.mimetype || "",
          textLength: extractedText.length,
          extractedLinksCount: extractedLinks.length
        }
      },
      "Resume parsed for onboarding successfully"
    )
  );
});

export const matchMasterDataForJd = asyncHandler(async (req, res) => {
  const parsed = matchMasterDataSchema.safeParse(req.body || {});

  if (!parsed.success) {
    throw new ApiError(400, "Invalid master-data match payload", parsed.error.issues);
  }

  const user = req.user;
  const resume = await Resume.findOne({ _id: parsed.data.resumeId, owner: user._id });

  if (!resume) {
    throw new ApiError(404, "Resume not found");
  }

  const structuredResume = await getResumeStructuredData(resume);
  const extractedText = await extractResumeRawText(resume);
  const focusedSections = extractFocusedResumeSections(extractedText || "");
  const userSkillValues = collectUserSkillValues(user);
  const userSkillSections = collectUserSkillSections(user);
  const normalizedSkills = extractNormalizedSkills(
    [...userSkillValues, ...collectSkillValues(structuredResume.skills)].length
      ? [...userSkillValues, ...collectSkillValues(structuredResume.skills)].join("\n")
      : focusedSections.skillsText
  );
  const projects = await Project.find({ owner: user._id }).sort({ updatedAt: -1 }).lean();
  const jdKeywords = extractJdKeywordsFromRequirements(parsed.data.jdRequirements, parsed.data.jobDescription);

  const rankedProjectViews = rankProjectsForJd(projects, jdKeywords).map((item) => ({
    ...formatRecommendedProject(item.project),
    relevanceScore: item.score
  }));

  const structuredExperiences = collectStructuredExperienceBlocks(user, structuredResume);
  const structuredAchievements = collectStructuredAchievementBlocks(user, structuredResume);

  const rankedExperiences = rankStructuredItems(structuredExperiences, (item) => scoreExperienceForJd(item, jdKeywords));
  const rankedAchievements = rankStructuredItems(structuredAchievements, (item) => scoreAchievementForJd(item, jdKeywords));

  const skillViews = uniqueStrings(normalizedSkills).map((skill, index) => ({
    id: `skill-${index}`,
    label: skill,
    relevanceScore: scoreSkillForJd(skill, jdKeywords)
  }));

  const sectionViews = userSkillSections.length
    ? userSkillSections.map((section, sectionIndex) => ({
        id: `section-${sectionIndex}`,
        title: section.title || `Section ${sectionIndex + 1}`,
        skills: section.skills.map((skill) => {
          const existing = skillViews.find((item) => item.label.toLowerCase() === skill.toLowerCase());
          return (
            existing || {
              id: `skill-${sectionIndex}-${skill}`,
              label: skill,
              relevanceScore: scoreSkillForJd(skill, jdKeywords)
            }
          );
        })
      }))
    : [{ id: "section-0", title: "Skills", skills: skillViews }];

  const jdResumeComment = buildJdResumeComment({
    jdKeywords,
    skills: skillViews,
    projects: rankedProjectViews,
    experiences: rankedExperiences,
    achievements: rankedAchievements
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profileSummary: user.about || "",
        skills: skillViews,
        skillSections: sectionViews,
        projects: rankedProjectViews,
        experiences: rankedExperiences,
        achievements: rankedAchievements,
        jdResumeComment
      },
      "Master data ranked successfully"
    )
  );
});

export const extendProjectBullet = asyncHandler(async (req, res) => {
  const parsed = expandProjectBulletSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid project bullet payload", parsed.error.issues);
  }

  // Verify authenticated user exists; expansion is available only for signed-in users. We already verified in middleware.

  let improvedBullet = "";
  try {
    improvedBullet = await expandProjectBullet(parsed.data);
  } catch (error) {
    throw new ApiError(502, error instanceof Error ? error.message : "AI provider request failed");
  }

  if (!improvedBullet) {
    throw new ApiError(502, "AI provider returned empty bullet output");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        improvedBullet
      },
      "Project bullet expanded successfully"
    )
  );
});

// ============================================
// Stage 1: Analyze Job Description
// ============================================
const analyzeJdSchema = z.object({
  jobDescription: z.string().min(20, "jobDescription must be at least 20 characters")
});

export const analyzeJobDescriptionEndpoint = asyncHandler(async (req, res) => {
  const parsed = analyzeJdSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid JD analysis payload", parsed.error.issues);
  }

  let jdAnalysis = null;
  try {
    jdAnalysis = await extractJdRequirementsWithLangChain({
      jobDescription: parsed.data.jobDescription
    });
  } catch (error) {
    throw new ApiError(502, error instanceof Error ? error.message : "JD analysis failed");
  }

  if (!jdAnalysis) {
    throw new ApiError(502, "AI provider returned empty JD analysis");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        jdAnalysis
      },
      "Job description analyzed successfully"
    )
  );
});

// ============================================
// Stage 2: Tailor with JD Analysis
// ============================================
const tailorWithJdAnalysisSchema = z.object({
  jobDescription: z.string().min(20, "jobDescription must be at least 20 characters"),
  jdAnalysis: z.record(z.any()).optional().default({}),
  resumeId: z.string().min(1, "resumeId is required").optional(),
  resumePayload: z.record(z.any()).optional(),
  tone: z.enum(["professional", "confident", "concise"]).optional().default("professional"),
  approvedSkills: z.array(z.string().trim().min(1)).max(40).optional().default([]),
  approvedProjectIds: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  approvedExperienceIds: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  approvedAchievementIds: z.array(z.string().trim().min(1)).max(20).optional().default([])
});

export const tailorResumeWithTwoStage = asyncHandler(async (req, res) => {
  const parsed = tailorWithJdAnalysisSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid two-stage tailor payload", parsed.error.issues);
  }

  const user = req.user;
  const resume = parsed.data.resumeId
    ? await Resume.findOne({ _id: parsed.data.resumeId, owner: user._id })
    : null;

  if (parsed.data.resumeId && !resume) {
    throw new ApiError(404, "Resume not found");
  }

  const structuredResume = resume
    ? await getResumeStructuredData(resume)
    : {
        name: normalizeText(user.displayName),
        email: normalizeText(user.email),
        phone: "",
        linkedin: normalizeText(user.linkedInUrl),
        github: normalizeText(user.githubUrl),
        education: [],
        experience: [],
        projects: [],
        achievements: [],
        skills: {}
      };

  const extractedText = resume ? await extractResumeRawText(resume) : "";
  const focusedSections = extractFocusedResumeSections(extractedText || "");
  const userSkillValues = collectUserSkillValues(user);
  const jdAnalysis = Object.keys(parsed.data.jdAnalysis || {}).length
    ? parsed.data.jdAnalysis
    : await extractJdRequirementsWithLangChain({ jobDescription: parsed.data.jobDescription });
  const normalizedSkills = extractNormalizedSkills(
    [...userSkillValues, ...collectSkillValues(structuredResume.skills)].length
      ? [...userSkillValues, ...collectSkillValues(structuredResume.skills)].join("\n")
      : focusedSections.skillsText
  );

  const userProjects = await Project.find({ owner: user._id }).sort({ updatedAt: -1 }).lean();
  const jdKeywords = extractJdKeywordsFromRequirements(jdAnalysis, parsed.data.jobDescription);

  const rankedProjects = rankProjectsForJd(userProjects, jdKeywords).map((item) => ({
    ...formatRecommendedProject(item.project),
    relevanceScore: item.score
  }));

  const recommendedSkills = recommendSkillsForJd({
    normalizedSkills,
    projects: rankedProjects,
    jdKeywords
  });

  const approvedSkillSet = new Set(parsed.data.approvedSkills.map((item) => item.trim()).filter(Boolean));
  const autoSkills = uniqueStrings(
    rankedProjects
      .flatMap((project) => project.stack || [])
      .concat(recommendedSkills)
      .slice(0, 20)
  );

  const selectedSkills = parsed.data.approvedSkills.length
    ? Array.from(approvedSkillSet).slice(0, 20)
    : (autoSkills.length ? autoSkills : recommendedSkills);

  const selectedProjects = toSelectedProjectsForTransformer(rankedProjects, parsed.data.approvedProjectIds);
  const candidateProjectsForTransformer = selectedProjects.length ? selectedProjects : rankedProjects;

  const structuredExperiences = collectStructuredExperienceBlocks(user, structuredResume);
  const structuredAchievements = collectStructuredAchievementBlocks(user, structuredResume);
  const rankedExperiences = rankStructuredItems(structuredExperiences, (item) => scoreExperienceForJd(item, jdKeywords));
  const rankedAchievements = rankStructuredItems(structuredAchievements, (item) => scoreAchievementForJd(item, jdKeywords));

  const approvedExperienceIdSet = new Set(parsed.data.approvedExperienceIds.map((item) => item.trim()).filter(Boolean));
  const approvedAchievementIdSet = new Set(parsed.data.approvedAchievementIds.map((item) => item.trim()).filter(Boolean));

  const selectedExperiences = approvedExperienceIdSet.size
    ? rankedExperiences.filter((item) => approvedExperienceIdSet.has(item.id)).slice(0, 6)
    : rankedExperiences.slice(0, 3);

  const selectedAchievements = approvedAchievementIdSet.size
    ? rankedAchievements.filter((item) => approvedAchievementIdSet.has(item.id)).slice(0, 6)
    : rankedAchievements.slice(0, 3);

  let optimized = null;
  try {
    optimized = await optimizeSkillsAndProjectsWithLangChain({
      jdRequirements: jdAnalysis,
      selectedSkills,
      selectedProjects: candidateProjectsForTransformer
    });
  } catch (error) {
    throw new ApiError(502, error instanceof Error ? error.message : "JSON tailoring failed");
  }

  if (!optimized) {
    throw new ApiError(502, "AI provider returned empty optimized JSON");
  }

  const fallbackOrderedSkills = uniqueStrings(selectedSkills);
  const optimizedSkills = {
    primary: uniqueStrings(optimized.optimizedSkills?.primary || []),
    secondary: uniqueStrings(optimized.optimizedSkills?.secondary || []),
    additional: uniqueStrings(optimized.optimizedSkills?.additional || []),
    removed: uniqueStrings(optimized.optimizedSkills?.removed || []),
    finalOrdered: uniqueStrings(optimized.optimizedSkills?.finalOrdered || fallbackOrderedSkills)
  };

  const optimizedProjects = enrichOptimizedProjectsWithSource(
    optimized.optimizedProjects || [],
    candidateProjectsForTransformer
  ).slice(0, 3);

  const matchInsights = buildMatchInsights({
    jdAnalysis,
    jdKeywords,
    normalizedSkills,
    selectedProjects: candidateProjectsForTransformer,
    selectedExperiences,
    selectedAchievements,
    optimizedSkills,
    optimizedProjects,
    rankedProjects
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        tailoredJson: {
          optimizedSkills,
          optimizedProjects,
          selectedExperiences,
          selectedAchievements,
          summaryNotes: uniqueStrings(optimized.summaryNotes || []),
          matchInsights
        },
        jdAnalysisUsed: jdAnalysis
      },
      "Resume tailored successfully using JD analyze->match->transform pipeline"
    )
  );
});
