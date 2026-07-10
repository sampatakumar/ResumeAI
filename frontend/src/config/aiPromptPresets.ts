export type AIPromptSectionKey =
  | "settingsExperience"
  | "settingsAchievement"
  | "projectDescription"
  | "resumeExperience"
  | "resumeAchievement"
  | "resumeProject";

export const AI_PROMPT_PRESETS: Record<AIPromptSectionKey, string> = {
  settingsExperience:
    "Generate 3 ATS-optimized experience bullets with strong action verbs, clear technical depth, and measurable or qualitative impact.",
  settingsAchievement:
    "Generate 3 ATS-optimized achievement bullets that highlight impact, clarity, and credibility in concise language.",
  projectDescription:
    "Generate 3 ATS-optimized project bullets that clearly describe the problem, implementation, and impact with strong technical language.",
  resumeExperience:
    "Generate 3 ATS-optimized experience bullets with strong action verbs, technical clarity, and clear impact.",
  resumeAchievement:
    "Generate 3 ATS-optimized achievement bullets that are concise, credible, and impact-focused.",
  resumeProject:
    "Generate 3 ATS-optimized project bullets covering challenge, implementation, and outcome with strong technical language."
};
