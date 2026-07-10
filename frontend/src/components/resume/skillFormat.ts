import type { ResumeData } from "./ResumeTypes";

export type RenderSkillLine = {
  label?: string;
  value: string;
};

const unique = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

export const getRenderableSkillLines = (data: ResumeData): RenderSkillLine[] => {
  const sectionLines = (data.skillSections ?? [])
    .map((section) => ({
      label: section.title.trim(),
      value: unique(section.skills ?? []).join(", ")
    }))
    .filter((line) => line.label || line.value)
    .map((line) => ({ label: line.label || undefined, value: line.value }));

  if (sectionLines.length) {
    return sectionLines;
  }

  const categorizedLines: RenderSkillLine[] = [
    { label: "Languages", value: unique(data.skills?.languages ?? []).join(", ") },
    { label: "Frameworks", value: unique(data.skills?.frameworks ?? []).join(", ") },
    { label: "Developer Tools", value: unique(data.skills?.tools ?? []).join(", ") },
    { label: "Libraries", value: unique(data.skills?.libraries ?? []).join(", ") }
  ].filter((line) => line.value);

  if (categorizedLines.length) {
    return categorizedLines;
  }

  const merged = unique([
    ...(data.skills?.languages ?? []),
    ...(data.skills?.frameworks ?? []),
    ...(data.skills?.tools ?? []),
    ...(data.skills?.libraries ?? [])
  ]);

  return merged.length ? [{ value: merged.join(", ") }] : [];
};
