import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { env } from "../config/env.js";

const jdRequirementsSchema = z.object({
  primaryTechStack: z.array(z.string()).default([]),
  secondarySkills: z.array(z.string()).default([]),
  coreResponsibilities: z.array(z.string()).default([]),
  atsKeywords: z.array(z.string()).default([]),
  seniority: z.string().default(""),
  roleTitle: z.string().default("")
});

const optimizedProjectSchema = z.object({
  id: z.string().default(""),
  title: z.string().default(""),
  description: z.string().default(""),
  stack: z.array(z.string()).default([]),
  date: z.string().default(""),
  githubUrl: z.string().default(""),
  demoUrl: z.string().default(""),
  bullets: z.array(z.string()).default([])
});

const optimizedTailorSchema = z.object({
  optimizedSkills: z.object({
    primary: z.array(z.string()).default([]),
    secondary: z.array(z.string()).default([]),
    additional: z.array(z.string()).default([]),
    removed: z.array(z.string()).default([]),
    finalOrdered: z.array(z.string()).default([])
  }),
  optimizedProjects: z.array(optimizedProjectSchema).default([]),
  summaryNotes: z.array(z.string()).default([])
});

const uniqueStrings = (items = []) => Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));

const tokenize = (value = "") =>
  String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

const buildSkillCanonicalMap = (items = []) => {
  const map = new Map();
  uniqueStrings(items).forEach((item) => {
    map.set(item.toLowerCase(), item);
  });
  return map;
};

const mapToAllowedSkills = (items = [], canonicalMap = new Map()) => {
  return uniqueStrings(items)
    .map((item) => canonicalMap.get(String(item || "").toLowerCase()))
    .filter(Boolean);
};

const sanitizeResumeBullet = (value = "") => {
  return String(value || "")
    .replace(/^\s*[-*•]\s*/, "")
    .replace(/^\s*(situation|task|action|result)\s*:\s*/i, "")
    .replace(/^\s*(s|t|a|r)\s*:\s*/i, "")
    .trim();
};

const createGroqModel = () => {
  return new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL,
    temperature: 0.2
  });
};

export const extractJdRequirementsWithLangChain = async ({ jobDescription }) => {
  const model = createGroqModel().withStructuredOutput(jdRequirementsSchema);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      [
        "You are an ATS and technical hiring analyst.",
        "Extract exact role requirements from a job description.",
        "Return only structured JSON in the requested schema.",
        "Do not hallucinate tools that are not in the JD."
      ].join(" ")
    ],
    [
      "human",
      [
        "Job Description:",
        "{jobDescription}",
        "",
        "Extract:",
        "1) primaryTechStack",
        "2) secondarySkills",
        "3) coreResponsibilities (top 3)",
        "4) atsKeywords",
        "5) seniority",
        "6) roleTitle"
      ].join("\n")
    ]
  ]);

  const chain = prompt.pipe(model);
  const result = await chain.invoke({ jobDescription });

  return {
    primaryTechStack: uniqueStrings(result.primaryTechStack),
    secondarySkills: uniqueStrings(result.secondarySkills),
    coreResponsibilities: uniqueStrings(result.coreResponsibilities).slice(0, 3),
    atsKeywords: uniqueStrings(result.atsKeywords),
    seniority: String(result.seniority || "").trim(),
    roleTitle: String(result.roleTitle || "").trim()
  };
};

export const optimizeSkillsAndProjectsWithLangChain = async ({
  jdRequirements,
  selectedSkills,
  selectedProjects
}) => {
  const model = createGroqModel().withStructuredOutput(optimizedTailorSchema);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      [
        "You are an expert ATS optimizer.",
        "Task: transform selected master data into JD-optimized JSON.",
        "Use STAR method internally to improve project bullets.",
        "Do not output explicit labels like Situation, Task, Action, Result, or S/T/A/R.",
        "Output final bullets in clean resume style only.",
        "For every optimized project, produce exactly 3 concrete bullets.",
        "Each bullet should reflect one specific implementation detail, one action taken, and one outcome or impact.",
        "Avoid abstract filler like 'built a system', 'worked on', or 'developed a project' unless followed by a concrete detail.",
        "Filter and prioritize skills for JD fit.",
        "Constraint: do not invent fake achievements, metrics, or technologies.",
        "Constraint: only use skill names and technologies already present in selected skills or selected projects.",
        "Constraint: every optimized project must keep the same project id as input.",
        "Constraint: do not invent project names, dates, links, or tools.",
        "If no numeric metric exists, keep impact qualitative.",
        "Return only valid JSON."
      ].join(" ")
    ],
    [
      "human",
      [
        "JD Requirements:",
        "{jdRequirements}",
        "",
        "Selected Skills:",
        "{selectedSkills}",
        "",
        "All Candidate Master Projects:",
        "{selectedProjects}",
        "",
        "Output schema fields:",
        "optimizedSkills.primary",
        "optimizedSkills.secondary",
        "optimizedSkills.additional",
        "optimizedSkills.removed",
        "optimizedSkills.finalOrdered",
        "optimizedProjects[] with clean resume bullets (no STAR labels)",
        "Choose at most 3 projects that are the best JD match from the candidate list.",
        "summaryNotes[]"
      ].join("\n")
    ]
  ]);

  const chain = prompt.pipe(model);
  const result = await chain.invoke({
    jdRequirements: JSON.stringify(jdRequirements || {}, null, 2),
    selectedSkills: JSON.stringify(uniqueStrings(selectedSkills || []), null, 2),
    selectedProjects: JSON.stringify(selectedProjects || [], null, 2)
  });

  const orderedSkills = uniqueStrings(result.optimizedSkills?.finalOrdered || []);
  const allowedSkills = uniqueStrings([
    ...(selectedSkills || []),
    ...((selectedProjects || []).flatMap((project) => project.stack || []))
  ]);
  const skillCanonicalMap = buildSkillCanonicalMap(allowedSkills);

  const primary = mapToAllowedSkills(result.optimizedSkills?.primary || [], skillCanonicalMap);
  const secondary = mapToAllowedSkills(result.optimizedSkills?.secondary || [], skillCanonicalMap);
  const additional = mapToAllowedSkills(result.optimizedSkills?.additional || [], skillCanonicalMap);

  const mappedOrdered = orderedSkills.length
    ? mapToAllowedSkills(orderedSkills, skillCanonicalMap)
    : [];

  const finalOrdered = mappedOrdered.length
    ? mappedOrdered
    : uniqueStrings([...primary, ...secondary, ...additional, ...allowedSkills]);

  const sourceProjectMap = new Map((selectedProjects || []).map((project) => [String(project.id || ""), project]));

  const groundedProjects = (result.optimizedProjects || [])
    .map((project) => {
      const source = sourceProjectMap.get(String(project.id || ""));
      if (!source) {
        return null;
      }

      const sourceTokens = new Set(
        tokenize([source.title, source.description, ...(source.stack || [])].join(" "))
      );

      const groundedBullets = uniqueStrings(project.bullets || []).filter((bullet) =>
        tokenize(bullet).some((token) => sourceTokens.has(token))
      );

      return {
        id: String(source.id || ""),
        title: String(project.title || source.title || "").trim(),
        description: String(project.description || source.description || "").trim(),
        stack: uniqueStrings(source.stack || []),
        date: String(source.date || "").trim(),
        githubUrl: String(source.githubUrl || "").trim(),
        demoUrl: String(source.demoUrl || "").trim(),
        bullets: (groundedBullets.length ? groundedBullets : [String(source.description || "").trim()])
          .map((bullet) => sanitizeResumeBullet(bullet))
          .filter(Boolean)
          .slice(0, 3)
      };
    })
    .filter(Boolean);

  return {
    optimizedSkills: {
      primary,
      secondary,
      additional,
      removed: uniqueStrings(result.optimizedSkills?.removed || []),
      finalOrdered
    },
    optimizedProjects: groundedProjects.length ? groundedProjects : (selectedProjects || []),
    summaryNotes: uniqueStrings(result.summaryNotes || [])
  };
};
