import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  User,
  Settings,
  FolderPlus,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiRequest, ensureExternalHttpsUrl } from "@/lib/api";
import { useAuth } from "@/contexts/use-auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type ProfileState = {
  displayName: string;
  headline: string;
  phone: string;
  about: string;
};

type PreferencesState = {
  linkedInUrl: string;
  githubUrl: string;
  customDomain: string;
  notificationsEnabled: boolean;
};

type EducationRow = {
  degree: string;
  specialization: string;
  college: string;
  location: string;
  endDate: string;
  grade: string;
};

type SkillSectionRow = {
  title: string;
  skills: string[];
};

type ExperienceRow = {
  role: string;
  company: string;
  location: string;
  date: string;
  bullets: string;
};

type ProjectRow = {
  title: string;
  description: string;
  stack: string;
  date: string;
  githubUrl: string;
  demoUrl: string;
};

type AchievementRow = {
  title: string;
  date: string;
  bullets: string;
};

type ParsedOnboardingPayload = {
  profile?: Partial<ProfileState>;
  preferences?: {
    linkedInUrl?: string;
    githubUrl?: string;
  };
  educationEntries?: EducationRow[];
  skillSections?: SkillSectionRow[];
  experience?: {
    role?: string;
    company?: string;
    location?: string;
    date?: string;
    bullets?: string[];
  }[];
  projects?: ProjectRow[];
  achievements?: {
    title?: string;
    date?: string;
    bullets?: string[];
  }[];
};

type BackendUser = NonNullable<ReturnType<typeof useAuth>["backendUser"]>;

const emptySkillRow = "";
const emptyEducationRow: EducationRow = {
  degree: "",
  specialization: "",
  college: "",
  location: "",
  endDate: "",
  grade: ""
};
const emptyExperienceRow: ExperienceRow = {
  role: "",
  company: "",
  location: "",
  date: "",
  bullets: ""
};
const emptyProjectRow: ProjectRow = {
  title: "",
  description: "",
  stack: "",
  date: "",
  githubUrl: "",
  demoUrl: ""
};
const emptyAchievementRow: AchievementRow = {
  title: "",
  date: "",
  bullets: ""
};

const defaultSkillSections = (): SkillSectionRow[] => [
  { title: "Languages", skills: [emptySkillRow] },
  { title: "Frameworks", skills: [emptySkillRow] },
  { title: "Tools", skills: [emptySkillRow] },
  { title: "Libraries", skills: [emptySkillRow] }
];

const normalizeOptionalUrl = (value: string) => {
  const trimmed = String(value || "").trim();
  return trimmed ? ensureExternalHttpsUrl(trimmed) : "";
};

const parseLines = (value: string) =>
  String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const unique = (items: string[]) =>
  Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));

const hasAnyProjectContent = (row: ProjectRow) =>
  [row.title, row.description, row.stack, row.date, row.githubUrl, row.demoUrl].some((field) => field.trim());

const isEducationRowsEmpty = (rows: EducationRow[]) =>
  !rows.some((row) => [row.degree, row.specialization, row.college, row.location, row.endDate, row.grade].some((field) => field.trim()));

const isSkillSectionsEmpty = (sections: SkillSectionRow[]) =>
  !sections.some((section) => section.skills.some((skill) => skill.trim()));

const isExperienceRowsEmpty = (rows: ExperienceRow[]) =>
  !rows.some((row) => row.role.trim() || row.company.trim() || row.location.trim() || row.date.trim() || parseLines(row.bullets).length > 0);

const isProjectRowsEmpty = (rows: ProjectRow[]) => !rows.some((row) => hasAnyProjectContent(row));

const isAchievementRowsEmpty = (rows: AchievementRow[]) =>
  !rows.some((row) => row.title.trim() || row.date.trim() || parseLines(row.bullets).length > 0);

const normalizeEducationRows = (items?: BackendUser["educationEntries"]): EducationRow[] => {
  const rows =
    items?.map((item) => ({
      degree: item.degree || "",
      specialization: item.specialization || "",
      college: item.college || "",
      location: item.location || "",
      endDate: item.endDate || "",
      grade: item.grade || ""
    })) || [];
  return rows.length ? rows : [{ ...emptyEducationRow }];
};

const normalizeExperienceRows = (items?: BackendUser["experience"]): ExperienceRow[] => {
  const rows =
    items?.map((item) => ({
      role: item.role || "",
      company: item.company || "",
      location: item.location || "",
      date: item.date || "",
      bullets: (item.bullets || []).join("\n")
    })) || [];
  return rows.length ? rows : [{ ...emptyExperienceRow }];
};

const normalizeSkillSections = (backendUser: BackendUser): SkillSectionRow[] => {
  if (backendUser.skillSections && backendUser.skillSections.length > 0) {
    const sections = backendUser.skillSections.map((section, index) => ({
      title: section.title?.trim() || `Section ${index + 1}`,
      skills: section.skills?.length ? [...section.skills] : [emptySkillRow]
    }));
    return sections.length ? sections : defaultSkillSections();
  }

  const inferred = [
    { title: "Languages", skills: unique(backendUser.skillLanguages || []) },
    { title: "Frameworks", skills: unique(backendUser.skillFrameworks || []) },
    { title: "Tools", skills: unique(backendUser.skillTools || []) },
    { title: "Libraries", skills: unique(backendUser.skillLibraries || []) }
  ].filter((section) => section.skills.length > 0);

  if (inferred.length > 0) {
    return inferred.map((section) => ({ ...section, skills: section.skills.length ? section.skills : [emptySkillRow] }));
  }

  return defaultSkillSections();
};

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { idToken, backendUser, refreshProfile } = useAuth();

  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [submitting, setSubmitting] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [parsingResume, setParsingResume] = useState(false);

  const [profile, setProfile] = useState<ProfileState>({
    displayName: "",
    headline: "",
    phone: "",
    about: ""
  });

  const [preferences, setPreferences] = useState<PreferencesState>({
    linkedInUrl: "",
    githubUrl: "",
    customDomain: "",
    notificationsEnabled: true
  });

  const [educationRows, setEducationRows] = useState<EducationRow[]>([{ ...emptyEducationRow }]);
  const [skillSections, setSkillSections] = useState<SkillSectionRow[]>(defaultSkillSections());
  const [experienceRows, setExperienceRows] = useState<ExperienceRow[]>([{ ...emptyExperienceRow }]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([{ ...emptyProjectRow }]);
  const [achievementRows, setAchievementRows] = useState<AchievementRow[]>([{ ...emptyAchievementRow }]);
  const [initializedFromBackend, setInitializedFromBackend] = useState(false);

  useEffect(() => {
    if (!backendUser || initializedFromBackend) {
      return;
    }

    setProfile({
      displayName: backendUser.displayName || "",
      headline: backendUser.headline || "",
      phone: backendUser.phone || "",
      about: backendUser.about || ""
    });

    setPreferences({
      linkedInUrl: backendUser.linkedInUrl || "",
      githubUrl: backendUser.githubUrl || "",
      customDomain: backendUser.customDomain || "",
      notificationsEnabled:
        typeof backendUser.notificationsEnabled === "boolean" ? backendUser.notificationsEnabled : true
    });

    setEducationRows(normalizeEducationRows(backendUser.educationEntries));
    setSkillSections(normalizeSkillSections(backendUser));
    setExperienceRows(normalizeExperienceRows(backendUser.experience));
    setInitializedFromBackend(true);
  }, [backendUser, initializedFromBackend]);

  const progressWidth = useMemo(() => `${(step / totalSteps) * 100}%`, [step]);

  const updateEducationRow = (index: number, patch: Partial<EducationRow>) =>
    setEducationRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  const addEducationRow = () => setEducationRows((current) => [...current, { ...emptyEducationRow }]);
  const removeEducationRow = (index: number) =>
    setEducationRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [{ ...emptyEducationRow }];
    });

  const updateSectionTitle = (sectionIndex: number, title: string) =>
    setSkillSections((current) =>
      current.map((section, index) => (index === sectionIndex ? { ...section, title } : section))
    );
  const updateSectionSkill = (sectionIndex: number, skillIndex: number, value: string) =>
    setSkillSections((current) =>
      current.map((section, index) =>
        index !== sectionIndex
          ? section
          : {
              ...section,
              skills: section.skills.map((skill, indexOfSkill) => (indexOfSkill === skillIndex ? value : skill))
            }
      )
    );
  const addSectionSkill = (sectionIndex: number) =>
    setSkillSections((current) =>
      current.map((section, index) =>
        index === sectionIndex ? { ...section, skills: [...section.skills, emptySkillRow] } : section
      )
    );
  const removeSectionSkill = (sectionIndex: number, skillIndex: number) =>
    setSkillSections((current) =>
      current.map((section, index) => {
        if (index !== sectionIndex) {
          return section;
        }
        const nextSkills = section.skills.filter((_, indexOfSkill) => indexOfSkill !== skillIndex);
        return {
          ...section,
          skills: nextSkills.length ? nextSkills : [emptySkillRow]
        };
      })
    );
  const addSkillSection = () =>
    setSkillSections((current) => [...current, { title: "New Section", skills: [emptySkillRow] }]);
  const removeSkillSection = (sectionIndex: number) =>
    setSkillSections((current) => {
      const next = current.filter((_, index) => index !== sectionIndex);
      return next.length ? next : defaultSkillSections();
    });

  const updateExperienceRow = (index: number, patch: Partial<ExperienceRow>) =>
    setExperienceRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  const addExperienceRow = () => setExperienceRows((current) => [...current, { ...emptyExperienceRow }]);
  const removeExperienceRow = (index: number) =>
    setExperienceRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [{ ...emptyExperienceRow }];
    });

  const updateProjectRow = (index: number, patch: Partial<ProjectRow>) =>
    setProjectRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  const addProjectRow = () => setProjectRows((current) => [...current, { ...emptyProjectRow }]);
  const removeProjectRow = (index: number) =>
    setProjectRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [{ ...emptyProjectRow }];
    });

  const updateAchievementRow = (index: number, patch: Partial<AchievementRow>) =>
    setAchievementRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  const addAchievementRow = () => setAchievementRows((current) => [...current, { ...emptyAchievementRow }]);
  const removeAchievementRow = (index: number) =>
    setAchievementRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [{ ...emptyAchievementRow }];
    });

  const validateCurrentStep = () => {
    if (step === 1) {
      if (profile.displayName.trim().length < 2) {
        toast.error("Please enter a valid display name.");
        return false;
      }
      if (!profile.phone.trim()) {
        toast.error("Please add a phone number.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      const linkedIn = normalizeOptionalUrl(preferences.linkedInUrl);
      const github = normalizeOptionalUrl(preferences.githubUrl);
      if (!linkedIn && !github) {
        toast.error("Add at least one professional link (LinkedIn or GitHub).");
        return false;
      }

      const hasEducation = educationRows.some((row) =>
        [row.degree, row.specialization, row.college, row.location, row.endDate, row.grade].some((field) =>
          field.trim()
        )
      );
      if (!hasEducation) {
        toast.error("Please add at least one education entry.");
        return false;
      }
      if (educationRows.length > 30) {
        toast.error("Maximum 30 education entries allowed.");
        return false;
      }

      const hasSkill = skillSections.some((section) => section.skills.some((skill) => skill.trim()));
      if (!hasSkill) {
        toast.error("Please add at least one skill.");
        return false;
      }
      if (skillSections.length > 30) {
        toast.error("Maximum 30 skill categories allowed.");
        return false;
      }
      const categoryWithTooManySkills = skillSections.find((section) => unique(section.skills).length > 100);
      if (categoryWithTooManySkills) {
        toast.error(`Maximum 100 skills allowed in "${categoryWithTooManySkills.title || "a category"}".`);
        return false;
      }

      return true;
    }

    if (step === 3) {
      const nonEmptyProjects = projectRows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => hasAnyProjectContent(row));

      if (nonEmptyProjects.length === 0) {
        toast.error("Please add at least one project.");
        return false;
      }

      const invalidProject = nonEmptyProjects.find(
        ({ row }) => row.title.trim().length < 2 || row.description.trim().length < 10
      );
      if (invalidProject) {
        toast.error(`Please provide a valid title and description for project ${invalidProject.index + 1}.`);
        return false;
      }
      if (projectRows.length > 30) {
        toast.error("Maximum 30 projects allowed.");
        return false;
      }

      if (experienceRows.length > 30) {
        toast.error("Maximum 30 experience entries allowed.");
        return false;
      }
      const expWithTooManyBullets = experienceRows.find((row) => parseLines(row.bullets).length > 50);
      if (expWithTooManyBullets) {
        toast.error(`Maximum 50 bullet points allowed in experience: "${expWithTooManyBullets.role || expWithTooManyBullets.company || 'Entry'}".`);
        return false;
      }

      if (achievementRows.length > 30) {
        toast.error("Maximum 30 achievement entries allowed.");
        return false;
      }
      const achWithTooManyBullets = achievementRows.find((row) => parseLines(row.bullets).length > 50);
      if (achWithTooManyBullets) {
        toast.error(`Maximum 50 bullet points allowed in achievement: "${achWithTooManyBullets.title || 'Entry'}".`);
        return false;
      }

      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }
    setStep((current) => Math.min(current + 1, totalSteps));
  };

  const handleBack = () => setStep((current) => Math.max(current - 1, 1));

  const handleResumeUploadForAutofill = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!idToken) {
      toast.error("Your session expired. Please sign in again.");
      navigate("/");
      return;
    }

    const formData = new FormData();
    formData.append("resumeFile", file);

    try {
      setParsingResume(true);

      const response = await apiRequest<{ parsed: ParsedOnboardingPayload }>("/ai/onboarding/parse-resume", {
        method: "POST",
        token: idToken,
        body: formData
      });

      const parsed = response.data.parsed || {};

      setProfile((current) => ({
        displayName: current.displayName.trim() || parsed.profile?.displayName?.trim() || current.displayName,
        headline: current.headline.trim() || parsed.profile?.headline?.trim() || current.headline,
        phone: current.phone.trim() || parsed.profile?.phone?.trim() || current.phone,
        about: current.about.trim() || parsed.profile?.about?.trim() || current.about
      }));

      setPreferences((current) => ({
        ...current,
        linkedInUrl: current.linkedInUrl.trim() || parsed.preferences?.linkedInUrl?.trim() || current.linkedInUrl,
        githubUrl: current.githubUrl.trim() || parsed.preferences?.githubUrl?.trim() || current.githubUrl
      }));

      const parsedEducation = Array.isArray(parsed.educationEntries)
        ? parsed.educationEntries
            .map((item) => ({
              degree: String(item.degree || "").trim(),
              specialization: String(item.specialization || "").trim(),
              college: String(item.college || "").trim(),
              location: String(item.location || "").trim(),
              endDate: String(item.endDate || "").trim(),
              grade: String(item.grade || "").trim()
            }))
            .filter((item) =>
              [item.degree, item.specialization, item.college, item.location, item.endDate, item.grade].some(Boolean)
            )
        : [];
      if (parsedEducation.length > 0) {
        setEducationRows((current) => (isEducationRowsEmpty(current) ? parsedEducation : current));
      }

      const parsedSkills = Array.isArray(parsed.skillSections)
        ? parsed.skillSections
            .map((section, index) => ({
              title: String(section.title || "").trim() || `Section ${index + 1}`,
              skills: unique((section.skills || []).map((skill) => String(skill || "").trim()))
            }))
            .filter((section) => section.skills.length > 0)
            .map((section) => ({ ...section, skills: section.skills.length ? section.skills : [emptySkillRow] }))
        : [];
      if (parsedSkills.length > 0) {
        setSkillSections((current) => (isSkillSectionsEmpty(current) ? parsedSkills : current));
      }

      const parsedExperience = Array.isArray(parsed.experience)
        ? parsed.experience
            .map((item) => ({
              role: String(item.role || "").trim(),
              company: String(item.company || "").trim(),
              location: String(item.location || "").trim(),
              date: String(item.date || "").trim(),
              bullets: Array.isArray(item.bullets) ? item.bullets.map((bullet) => String(bullet || "").trim()).filter(Boolean).join("\n") : ""
            }))
            .filter((item) => item.role || item.company || item.location || item.date || item.bullets)
        : [];
      if (parsedExperience.length > 0) {
        setExperienceRows((current) => (isExperienceRowsEmpty(current) ? parsedExperience : current));
      }

      const parsedProjects = Array.isArray(parsed.projects)
        ? parsed.projects
            .map((project) => ({
              title: String(project.title || "").trim(),
              description: String(project.description || "").trim(),
              stack: String(project.stack || "").trim(),
              date: String(project.date || "").trim(),
              githubUrl: String(project.githubUrl || "").trim(),
              demoUrl: String(project.demoUrl || "").trim()
            }))
            .filter((project) => hasAnyProjectContent(project))
        : [];
      if (parsedProjects.length > 0) {
        setProjectRows((current) => (isProjectRowsEmpty(current) ? parsedProjects : current));
      }

      const parsedAchievements = Array.isArray(parsed.achievements)
        ? parsed.achievements
            .map((item) => ({
              title: String(item.title || "").trim(),
              date: String(item.date || "").trim(),
              bullets: Array.isArray(item.bullets) ? item.bullets.map((b) => String(b || "").trim()).filter(Boolean).join("\n") : ""
            }))
            .filter((item) => item.title || item.date || item.bullets)
        : [];
      if (parsedAchievements.length > 0) {
        setAchievementRows((current) => (isAchievementRowsEmpty(current) ? parsedAchievements : current));
      }

      toast.success("Resume parsed successfully. Please review and complete any missing fields.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse resume for onboarding.");
    } finally {
      setParsingResume(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!idToken) {
      toast.error("Your session expired. Please sign in again.");
      navigate("/");
      return;
    }

    try {
      setGeneratingSummary(true);

      // Save a lightweight draft first so backend user object is at least initialized.
      await apiRequest<{ user: unknown }>("/auth/me", {
        method: "PATCH",
        token: idToken,
        body: {
          displayName: profile.displayName.trim(),
          headline: profile.headline.trim(),
          phone: profile.phone.trim(),
          linkedInUrl: normalizeOptionalUrl(preferences.linkedInUrl),
          githubUrl: normalizeOptionalUrl(preferences.githubUrl)
        }
      });

      // Serialize form state as override context for the AI summary generator
      const normalizedEducationEntries = educationRows
        .map((item) => ({
          degree: item.degree.trim(),
          specialization: item.specialization.trim(),
          college: item.college.trim(),
          location: item.location.trim(),
          endDate: item.endDate.trim(),
          grade: item.grade.trim()
        }))
        .filter((item) =>
          [item.degree, item.specialization, item.college, item.location, item.endDate, item.grade].some(Boolean)
        );

      const normalizedSkillSections = skillSections
        .map((section) => ({
          title: section.title.trim(),
          skills: unique(section.skills.flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean)))
        }))
        .filter((section) => section.title || section.skills.length > 0);

      const sectionSkillsByTitle = normalizedSkillSections.map((section) => ({
        title: section.title.toLowerCase(),
        skills: section.skills
      }));
      const collectByTitle = (keywords: string[]) =>
        unique(
          sectionSkillsByTitle
            .filter((section) => keywords.some((keyword) => section.title.includes(keyword)))
            .flatMap((section) => section.skills)
        );
      const allSectionSkills = unique(normalizedSkillSections.flatMap((section) => section.skills));
      const skillLanguages = collectByTitle(["language", "languages"]);
      const skillFrameworks = collectByTitle(["framework", "frameworks", "frontend", "backend"]);
      const skillTools = collectByTitle(["tool", "tools", "devops", "platform"]);
      const skillLibraries = collectByTitle(["library", "libraries"]);
      const hasAnyCategorized =
        skillLanguages.length > 0 ||
        skillFrameworks.length > 0 ||
        skillTools.length > 0 ||
        skillLibraries.length > 0;

      const bodySkills = hasAnyCategorized
        ? [...skillLanguages, ...skillFrameworks, ...skillTools, ...skillLibraries]
        : allSectionSkills;

      const bodyEducationLines = normalizedEducationEntries
        .map((item) =>
          [item.degree, item.specialization, item.college, item.location, item.endDate, item.grade]
            .filter(Boolean)
            .join(" | ")
        )
        .filter(Boolean);

      const bodyAchievements = achievementRows
        .map((item) => ({
          title: item.title.trim(),
          date: item.date.trim(),
          bullets: parseLines(item.bullets)
        }))
        .filter((item) => item.title || item.bullets.length > 0);

      const bodyProjects = projectRows
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          stack: item.stack.trim(),
          date: item.date.trim()
        }))
        .filter((item) => [item.title, item.description, item.stack, item.date].some(Boolean));

      const response = await apiRequest<{ profileSummary: string }>("/ai/profile-summary", {
        method: "POST",
        token: idToken,
        body: {
          tone: "professional",
          maxWords: 90,
          skills: bodySkills,
          educationLines: bodyEducationLines,
          achievements: bodyAchievements,
          projects: bodyProjects
        }
      });

      const generated = String(response.data.profileSummary || "").trim();
      if (!generated) {
        toast.error("AI returned an empty summary. Please try again.");
        return;
      }

      setProfile((current) => ({ ...current, about: generated }));
      toast.success("AI professional summary generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate summary.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleComplete = async () => {
    if (!idToken) {
      toast.error("Your session expired. Please sign in again.");
      navigate("/");
      return;
    }

    if (!validateCurrentStep()) {
      return;
    }

    const normalizedEducationEntries = educationRows
      .map((item) => ({
        degree: item.degree.trim(),
        specialization: item.specialization.trim(),
        college: item.college.trim(),
        location: item.location.trim(),
        endDate: item.endDate.trim(),
        grade: item.grade.trim()
      }))
      .filter((item) =>
        [item.degree, item.specialization, item.college, item.location, item.endDate, item.grade].some(Boolean)
      );

    const normalizedSkillSections = skillSections
      .map((section) => ({
        title: section.title.trim(),
        skills: unique(section.skills.flatMap((s) => s.split(",").map((x) => x.trim()).filter(Boolean)))
      }))
      .filter((section) => section.title || section.skills.length > 0);

    const sectionSkillsByTitle = normalizedSkillSections.map((section) => ({
      title: section.title.toLowerCase(),
      skills: section.skills
    }));
    const collectByTitle = (keywords: string[]) =>
      unique(
        sectionSkillsByTitle
          .filter((section) => keywords.some((keyword) => section.title.includes(keyword)))
          .flatMap((section) => section.skills)
      );
    const allSectionSkills = unique(normalizedSkillSections.flatMap((section) => section.skills));
    const skillLanguages = collectByTitle(["language", "languages"]);
    const skillFrameworks = collectByTitle(["framework", "frameworks", "frontend", "backend"]);
    const skillTools = collectByTitle(["tool", "tools", "devops", "platform"]);
    const skillLibraries = collectByTitle(["library", "libraries"]);
    const hasAnyCategorized =
      skillLanguages.length > 0 ||
      skillFrameworks.length > 0 ||
      skillTools.length > 0 ||
      skillLibraries.length > 0;

    const normalizedExperience = experienceRows
      .map((item) => ({
        role: item.role.trim(),
        company: item.company.trim(),
        location: item.location.trim(),
        date: item.date.trim(),
        bullets: parseLines(item.bullets)
      }))
      .filter((item) => item.role || item.company || item.bullets.length > 0);

    const normalizedProjects = projectRows
      .map((item, index) => ({
        index,
        payload: {
          title: item.title.trim(),
          description: item.description.trim(),
          stack: item.stack.trim(),
          date: item.date.trim(),
          githubUrl: normalizeOptionalUrl(item.githubUrl),
          demoUrl: normalizeOptionalUrl(item.demoUrl)
        }
      }))
      .filter(({ payload }) => [payload.title, payload.description, payload.stack, payload.date, payload.githubUrl, payload.demoUrl].some(Boolean));

    const invalidProject = normalizedProjects.find(
      ({ payload }) => payload.title.length < 2 || payload.description.length < 10
    );
    if (invalidProject) {
      toast.error(`Please provide a valid title and description for project ${invalidProject.index + 1}.`);
      return;
    }

    try {
      setSubmitting(true);

      await apiRequest<{ user: unknown }>("/auth/me", {
        method: "PATCH",
        token: idToken,
        body: {
          displayName: profile.displayName.trim(),
          headline: profile.headline.trim(),
          phone: profile.phone.trim(),
          about: profile.about.trim(),
          customDomain: preferences.customDomain.trim(),
          notificationsEnabled: preferences.notificationsEnabled,
          linkedInUrl: normalizeOptionalUrl(preferences.linkedInUrl),
          githubUrl: normalizeOptionalUrl(preferences.githubUrl),
          education: normalizedEducationEntries
            .map((item) =>
              [item.degree, item.specialization, item.college, item.location, item.endDate, item.grade]
                .filter(Boolean)
                .join(" | ")
            )
            .filter(Boolean),
          educationEntries: normalizedEducationEntries,
          skillSections: normalizedSkillSections,
          skillLanguages: hasAnyCategorized ? skillLanguages : allSectionSkills,
          skillFrameworks: hasAnyCategorized ? skillFrameworks : [],
          skillTools: hasAnyCategorized ? skillTools : [],
          skillLibraries: hasAnyCategorized ? skillLibraries : [],
          experience: normalizedExperience,
          achievements: achievementRows
            .map((item) => ({
              title: item.title.trim(),
              date: item.date.trim(),
              bullets: parseLines(item.bullets)
            }))
            .filter((item) => item.title || item.bullets.length > 0)
        }
      });

      await Promise.all(
        normalizedProjects.map(({ payload }) =>
          apiRequest<{ project: unknown }>("/projects", {
            method: "POST",
            token: idToken,
            body: payload
          })
        )
      );

      await apiRequest<{ user: unknown }>("/auth/me", {
        method: "PATCH",
        token: idToken,
        body: {
          onboardingCompleted: true
        }
      });

      await refreshProfile();
      toast.success("Onboarding completed. Welcome to BuildMyResume.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-8">
      <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="glass relative w-full max-w-2xl rounded-3xl border border-primary/20 p-8 shadow-2xl sm:p-12 transition-all duration-500">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary" />
              Welcome Setup
            </h1>
            <span className="text-sm font-semibold text-primary/80 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              Step {step} of {totalSteps}
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-background/50 border border-border/40 overflow-hidden">
            <div
              className="h-full bg-primary glow-primary transition-all duration-500"
              style={{ width: progressWidth }}
            />
          </div>
        </div>

        <div className="min-h-[280px]">
          {step === 1 && (
            <ProfileStep
              profile={profile}
              setProfile={setProfile}
              parsingResume={parsingResume}
              onResumeFileSelect={handleResumeUploadForAutofill}
            />
          )}
          {step === 2 && (
            <PreferencesStep
              preferences={preferences}
              setPreferences={setPreferences}
              educationRows={educationRows}
              onUpdateEducationRow={updateEducationRow}
              onAddEducationRow={addEducationRow}
              onRemoveEducationRow={removeEducationRow}
              skillSections={skillSections}
              onUpdateSectionTitle={updateSectionTitle}
              onUpdateSectionSkill={updateSectionSkill}
              onAddSectionSkill={addSectionSkill}
              onRemoveSectionSkill={removeSectionSkill}
              onAddSkillSection={addSkillSection}
              onRemoveSkillSection={removeSkillSection}
              experienceRows={experienceRows}
              onUpdateExperienceRow={updateExperienceRow}
              onAddExperienceRow={addExperienceRow}
              onRemoveExperienceRow={removeExperienceRow}
            />
          )}
          {step === 3 && (
            <ProjectStep
              projectRows={projectRows}
              onUpdateProjectRow={updateProjectRow}
              onAddProjectRow={addProjectRow}
              onRemoveProjectRow={removeProjectRow}
              achievementRows={achievementRows}
              onUpdateAchievementRow={updateAchievementRow}
              onAddAchievementRow={addAchievementRow}
              onRemoveAchievementRow={removeAchievementRow}
              profile={profile}
              setProfile={setProfile}
              generatingSummary={generatingSummary}
              onGenerateSummary={handleGenerateSummary}
            />
          )}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-border/30 pt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className={cn("gap-2", step === 1 && "invisible")}
            disabled={submitting || parsingResume}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              className="gap-2 bg-primary text-primary-foreground active:scale-95 transition-all"
              disabled={submitting || generatingSummary || parsingResume}
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => void handleComplete()}
              className="gap-2 bg-primary text-primary-foreground active:scale-95 transition-all"
              disabled={submitting || generatingSummary || parsingResume}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Initialize Workspace <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileStep({
  profile,
  setProfile,
  parsingResume,
  onResumeFileSelect
}: {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
  parsingResume: boolean;
  onResumeFileSelect: (file: File | null) => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex items-center gap-3 border-b border-border/20 pb-4 mb-6">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Profile Basics</h2>
          <p className="text-sm text-muted-foreground">Upload an existing resume for auto-fill, or enter details manually.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass rounded-2xl border border-border/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Have a resume already?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload PDF/DOCX/TXT/image and we will auto-fill what we can.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={parsingResume}
              onClick={() => {
                const element = document.getElementById("onboarding-resume-upload") as HTMLInputElement | null;
                element?.click();
              }}
            >
              {parsingResume ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Resume
                </>
              )}
            </Button>
            <input
              id="onboarding-resume-upload"
              type="file"
              accept=".pdf,.docx,.txt,.tex,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                onResumeFileSelect(file);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Display Name</label>
          <Input
            placeholder="Enter your name"
            className="h-12"
            value={profile.displayName}
            onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Role / Designation</label>
          <Input
            placeholder="e.g. Frontend Engineer"
            className="h-12"
            value={profile.headline}
            onChange={(event) => setProfile((current) => ({ ...current, headline: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
          <Input
            placeholder="e.g. +91 98XXXXXXXX"
            className="h-12"
            value={profile.phone}
            onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
          />
        </div>
      </div>
    </div>
  );
}

function PreferencesStep({
  preferences,
  setPreferences,
  educationRows,
  onUpdateEducationRow,
  onAddEducationRow,
  onRemoveEducationRow,
  skillSections,
  onUpdateSectionTitle,
  onUpdateSectionSkill,
  onAddSectionSkill,
  onRemoveSectionSkill,
  onAddSkillSection,
  onRemoveSkillSection,
  experienceRows,
  onUpdateExperienceRow,
  onAddExperienceRow,
  onRemoveExperienceRow
}: {
  preferences: PreferencesState;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesState>>;
  educationRows: EducationRow[];
  onUpdateEducationRow: (index: number, patch: Partial<EducationRow>) => void;
  onAddEducationRow: () => void;
  onRemoveEducationRow: (index: number) => void;
  skillSections: SkillSectionRow[];
  onUpdateSectionTitle: (sectionIndex: number, value: string) => void;
  onUpdateSectionSkill: (sectionIndex: number, skillIndex: number, value: string) => void;
  onAddSectionSkill: (sectionIndex: number) => void;
  onRemoveSectionSkill: (sectionIndex: number, skillIndex: number) => void;
  onAddSkillSection: () => void;
  onRemoveSkillSection: (sectionIndex: number) => void;
  experienceRows: ExperienceRow[];
  onUpdateExperienceRow: (index: number, patch: Partial<ExperienceRow>) => void;
  onAddExperienceRow: () => void;
  onRemoveExperienceRow: (index: number) => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex items-center gap-3 border-b border-border/20 pb-4 mb-6">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Settings Essentials</h2>
          <p className="text-sm text-muted-foreground">
            Complete links, education, and skills here. Experience is optional.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">LinkedIn URL</label>
          <Input
            placeholder="https://linkedin.com/in/your-profile"
            className="h-12"
            value={preferences.linkedInUrl}
            onChange={(event) => setPreferences((current) => ({ ...current, linkedInUrl: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">GitHub URL</label>
          <Input
            placeholder="https://github.com/your-username"
            className="h-12"
            value={preferences.githubUrl}
            onChange={(event) => setPreferences((current) => ({ ...current, githubUrl: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Custom Domain (Optional)</label>
          <Input
            placeholder="portfolio.yourname.com"
            className="h-12"
            value={preferences.customDomain}
            onChange={(event) => setPreferences((current) => ({ ...current, customDomain: event.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between glass p-4 rounded-2xl">
          <div>
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <p className="text-xs text-muted-foreground mt-1">Enable reminders and updates in your workspace.</p>
          </div>
          <Switch
            checked={preferences.notificationsEnabled}
            onCheckedChange={(checked) => setPreferences((current) => ({ ...current, notificationsEnabled: checked }))}
          />
        </div>

        <div className="border-t border-border/30 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Education</h3>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAddEducationRow}>
              <Plus className="h-3.5 w-3.5" />
              Add Education
            </Button>
          </div>
          <div className="space-y-3">
            {educationRows.map((row, index) => (
              <div key={`education-${index}`} className="glass rounded-2xl border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Education {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoveEducationRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Degree"
                    value={row.degree}
                    onChange={(event) => onUpdateEducationRow(index, { degree: event.target.value })}
                  />
                  <Input
                    placeholder="Specialization"
                    value={row.specialization}
                    onChange={(event) => onUpdateEducationRow(index, { specialization: event.target.value })}
                  />
                  <Input
                    placeholder="College / Institute"
                    value={row.college}
                    onChange={(event) => onUpdateEducationRow(index, { college: event.target.value })}
                  />
                  <Input
                    placeholder="Location"
                    value={row.location}
                    onChange={(event) => onUpdateEducationRow(index, { location: event.target.value })}
                  />
                  <Input
                    placeholder="End Date"
                    value={row.endDate}
                    onChange={(event) => onUpdateEducationRow(index, { endDate: event.target.value })}
                  />
                  <Input
                    placeholder="Grade / CGPA"
                    value={row.grade}
                    onChange={(event) => onUpdateEducationRow(index, { grade: event.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Skills</h3>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAddSkillSection}>
              <Plus className="h-3.5 w-3.5" />
              Add Section
            </Button>
          </div>

          <div className="space-y-3">
            {skillSections.map((section, sectionIndex) => (
              <div key={`skill-section-${sectionIndex}`} className="glass rounded-2xl border border-border/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Section title (e.g. Languages)"
                    value={section.title}
                    onChange={(event) => onUpdateSectionTitle(sectionIndex, event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => onRemoveSkillSection(sectionIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {section.skills.map((skill, skillIndex) => (
                    <div key={`skill-${sectionIndex}-${skillIndex}`} className="flex items-center gap-2">
                      <Input
                        placeholder="Add skill"
                        value={skill}
                        onChange={(event) => onUpdateSectionSkill(sectionIndex, skillIndex, event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => onRemoveSectionSkill(sectionIndex, skillIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => onAddSectionSkill(sectionIndex)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Skill
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Experience (Optional)</h3>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAddExperienceRow}>
              <Plus className="h-3.5 w-3.5" />
              Add Experience
            </Button>
          </div>

          <div className="space-y-3">
            {experienceRows.map((row, index) => (
              <div key={`experience-${index}`} className="glass rounded-2xl border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Experience {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoveExperienceRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Role"
                    value={row.role}
                    onChange={(event) => onUpdateExperienceRow(index, { role: event.target.value })}
                  />
                  <Input
                    placeholder="Company"
                    value={row.company}
                    onChange={(event) => onUpdateExperienceRow(index, { company: event.target.value })}
                  />
                  <Input
                    placeholder="Location"
                    value={row.location}
                    onChange={(event) => onUpdateExperienceRow(index, { location: event.target.value })}
                  />
                  <Input
                    placeholder="Duration"
                    value={row.date}
                    onChange={(event) => onUpdateExperienceRow(index, { date: event.target.value })}
                  />
                </div>

                <Textarea
                  placeholder="Har line par ek bullet point likhein"
                  className="min-h-[100px] resize-none"
                  value={row.bullets}
                  onChange={(event) => onUpdateExperienceRow(index, { bullets: event.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectStep({
  projectRows,
  onUpdateProjectRow,
  onAddProjectRow,
  onRemoveProjectRow,
  achievementRows,
  onUpdateAchievementRow,
  onAddAchievementRow,
  onRemoveAchievementRow,
  profile,
  setProfile,
  generatingSummary,
  onGenerateSummary
}: {
  projectRows: ProjectRow[];
  onUpdateProjectRow: (index: number, patch: Partial<ProjectRow>) => void;
  onAddProjectRow: () => void;
  onRemoveProjectRow: (index: number) => void;
  achievementRows: AchievementRow[];
  onUpdateAchievementRow: (index: number, patch: Partial<AchievementRow>) => void;
  onAddAchievementRow: () => void;
  onRemoveAchievementRow: (index: number) => void;
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
  generatingSummary: boolean;
  onGenerateSummary: () => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex items-center gap-3 border-b border-border/20 pb-4 mb-6">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <FolderPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Projects & Summary</h2>
          <p className="text-sm text-muted-foreground">Multiple projects add karein, phir last me AI summary generate karein.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Projects</h3>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAddProjectRow}>
            <Plus className="h-3.5 w-3.5" />
            Add Project
          </Button>
        </div>

        <div className="space-y-3">
          {projectRows.map((project, index) => (
            <div key={`project-${index}`} className="glass rounded-2xl border border-border/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Project {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onRemoveProjectRow(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Input
                placeholder="Project Title"
                value={project.title}
                onChange={(event) => onUpdateProjectRow(index, { title: event.target.value })}
              />
              <Textarea
                placeholder="Describe what this project solves and your contribution."
                className="min-h-[100px] resize-none"
                value={project.description}
                onChange={(event) => onUpdateProjectRow(index, { description: event.target.value })}
              />
              <Input
                placeholder="Tech Stack (comma separated)"
                value={project.stack}
                onChange={(event) => onUpdateProjectRow(index, { stack: event.target.value })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Date"
                  value={project.date}
                  onChange={(event) => onUpdateProjectRow(index, { date: event.target.value })}
                />
                <Input
                  placeholder="GitHub URL (Optional)"
                  value={project.githubUrl}
                  onChange={(event) => onUpdateProjectRow(index, { githubUrl: event.target.value })}
                />
              </div>

              <Input
                placeholder="Live Demo URL (Optional)"
                value={project.demoUrl}
                onChange={(event) => onUpdateProjectRow(index, { demoUrl: event.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="border-t border-border/30 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements (Optional)
            </h3>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAddAchievementRow}>
              <Plus className="h-3.5 w-3.5" />
              Add Achievement
            </Button>
          </div>

          <div className="space-y-3">
            {achievementRows.map((row, index) => (
              <div key={`achievement-${index}`} className="glass rounded-2xl border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Achievement {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemoveAchievementRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Achievement title"
                    value={row.title}
                    onChange={(event) => onUpdateAchievementRow(index, { title: event.target.value })}
                  />
                  <Input
                    placeholder="Date (e.g. 2024)"
                    value={row.date}
                    onChange={(event) => onUpdateAchievementRow(index, { date: event.target.value })}
                  />
                </div>

                <Textarea
                  placeholder="Extra details — one per line (optional)"
                  className="min-h-[80px] resize-none"
                  value={row.bullets}
                  onChange={(event) => onUpdateAchievementRow(index, { bullets: event.target.value })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/30 pt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Professional Summary</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={generatingSummary}
              onClick={onGenerateSummary}
            >
              {generatingSummary ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
