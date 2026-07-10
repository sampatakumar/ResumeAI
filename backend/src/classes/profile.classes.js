const normalizeText = (value) => (value || "").toString().trim();

const uniqueStrings = (items = []) =>
  Array.from(new Set(items.map((item) => normalizeText(item)).filter(Boolean)));

const toStringArray = (items) => (Array.isArray(items) ? items : []);

const cleanStackItem = (value) => {
  if (!value) {
    return "";
  }

  let cleaned = value
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();

  if (cleaned.includes(":")) {
    cleaned = cleaned.split(":").slice(1).join(":").trim();
  }

  cleaned = cleaned.replace(/\(.*?\)/g, "").trim();

  return cleaned;
};

const toStackArray = (value) => {
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((item) => cleanStackItem(item)).filter(Boolean));
  }

  if (typeof value === "string") {
    return uniqueStrings(
      value
        .split(",")
        .map((item) => cleanStackItem(item))
        .filter(Boolean)
    );
  }

  return [];
};

export class EducationEntry {
  constructor(payload = {}) {
    this.degree = normalizeText(payload.degree);
    this.specialization = normalizeText(payload.specialization);
    this.college = normalizeText(payload.college);
    this.location = normalizeText(payload.location);
    this.endDate = normalizeText(payload.endDate);
    this.grade = normalizeText(payload.grade);
  }

  static from(payload) {
    return new EducationEntry(payload);
  }

  static fromList(items) {
    return toStringArray(items).map((item) => EducationEntry.from(item));
  }

  isEmpty() {
    return ![this.degree, this.specialization, this.college, this.location, this.endDate, this.grade].some(Boolean);
  }

  toObject() {
    return {
      degree: this.degree,
      specialization: this.specialization,
      college: this.college,
      location: this.location,
      endDate: this.endDate,
      grade: this.grade
    };
  }

  toSummaryLine() {
    return [this.degree, this.specialization, this.college, this.location, this.endDate, this.grade].filter(Boolean).join(" | ");
  }
}

export class SkillSection {
  constructor(payload = {}) {
    this.title = normalizeText(payload.title);
    this.skills = uniqueStrings(toStringArray(payload.skills));
  }

  static from(payload) {
    return new SkillSection(payload);
  }

  static fromList(items) {
    return toStringArray(items).map((item) => SkillSection.from(item));
  }

  isEmpty() {
    return !this.title && this.skills.length === 0;
  }

  toObject() {
    return {
      title: this.title,
      skills: this.skills
    };
  }
}

export class ExperienceEntry {
  constructor(payload = {}) {
    this.role = normalizeText(payload.role);
    this.company = normalizeText(payload.company);
    this.location = normalizeText(payload.location);
    this.date = normalizeText(payload.date);
    this.bullets = uniqueStrings(toStringArray(payload.bullets));
  }

  static from(payload) {
    return new ExperienceEntry(payload);
  }

  static fromList(items) {
    return toStringArray(items).map((item) => ExperienceEntry.from(item));
  }

  isEmpty() {
    return !this.role && !this.company && !this.location && !this.date && this.bullets.length === 0;
  }

  toObject() {
    return {
      role: this.role,
      company: this.company,
      location: this.location,
      date: this.date,
      bullets: this.bullets
    };
  }
}

export class AchievementEntry {
  constructor(payload = {}) {
    this.title = normalizeText(payload.title);
    this.date = normalizeText(payload.date);
    this.bullets = uniqueStrings(toStringArray(payload.bullets));
  }

  static from(payload) {
    return new AchievementEntry(payload);
  }

  static fromList(items) {
    return toStringArray(items).map((item) => AchievementEntry.from(item));
  }

  isEmpty() {
    return !this.title && !this.date && this.bullets.length === 0;
  }

  toObject() {
    return {
      title: this.title,
      date: this.date,
      bullets: this.bullets
    };
  }
}

export class ProjectEntry {
  constructor(payload = {}) {
    this.title = normalizeText(payload.title ?? payload.name);
    this.description = normalizeText(payload.description);
    this.stack = toStackArray(payload.stack ?? payload.technologies);
    this.date = normalizeText(payload.date);
    this.githubUrl = normalizeText(payload.githubUrl);
    this.demoUrl = normalizeText(payload.demoUrl);
  }

  static from(payload) {
    return new ProjectEntry(payload);
  }

  static fromList(items) {
    return toStringArray(items).map((item) => ProjectEntry.from(item));
  }

  isEmpty() {
    return !this.title && !this.description && this.stack.length === 0 && !this.date && !this.githubUrl && !this.demoUrl;
  }

  toObject() {
    return {
      title: this.title,
      description: this.description,
      stack: this.stack,
      date: this.date,
      githubUrl: this.githubUrl,
      demoUrl: this.demoUrl
    };
  }
}

const collectSkillByTitle = (sections, keywords) => {
  return uniqueStrings(
    sections
      .filter((section) => keywords.some((keyword) => section.title.toLowerCase().includes(keyword)))
      .flatMap((section) => section.skills)
  );
};

export const normalizeSkillBuckets = ({
  skillLanguages = [],
  skillFrameworks = [],
  skillTools = [],
  skillLibraries = [],
  skillSections = []
}) => {
  const normalizedSections = SkillSection.fromList(skillSections)
    .filter((section) => !section.isEmpty())
    .map((section) => section.toObject());

  const providedLanguages = uniqueStrings(skillLanguages);
  const providedFrameworks = uniqueStrings(skillFrameworks);
  const providedTools = uniqueStrings(skillTools);
  const providedLibraries = uniqueStrings(skillLibraries);

  const hasProvidedBuckets =
    providedLanguages.length > 0 || providedFrameworks.length > 0 || providedTools.length > 0 || providedLibraries.length > 0;

  if (hasProvidedBuckets || normalizedSections.length === 0) {
    return {
      skillSections: normalizedSections,
      skillLanguages: providedLanguages,
      skillFrameworks: providedFrameworks,
      skillTools: providedTools,
      skillLibraries: providedLibraries
    };
  }

  const derivedLanguages = collectSkillByTitle(normalizedSections, ["language", "languages"]);
  const derivedFrameworks = collectSkillByTitle(normalizedSections, ["framework", "frameworks", "frontend", "backend"]);
  const derivedTools = collectSkillByTitle(normalizedSections, ["tool", "tools", "devops", "platform"]);
  const derivedLibraries = collectSkillByTitle(normalizedSections, ["library", "libraries"]);
  const allSectionSkills = uniqueStrings(normalizedSections.flatMap((section) => section.skills));
  const hasAnyDerived = derivedLanguages.length || derivedFrameworks.length || derivedTools.length || derivedLibraries.length;

  return {
    skillSections: normalizedSections,
    skillLanguages: hasAnyDerived ? derivedLanguages : allSectionSkills,
    skillFrameworks: hasAnyDerived ? derivedFrameworks : [],
    skillTools: hasAnyDerived ? derivedTools : [],
    skillLibraries: hasAnyDerived ? derivedLibraries : []
  };
};

export const normalizeTextArray = (items) => uniqueStrings(toStringArray(items));
