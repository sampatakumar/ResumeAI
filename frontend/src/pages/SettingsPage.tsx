import { motion } from "framer-motion";
import { 
  Globe, User, Plus, Trash2, Sparkles, 
  Link, Cpu, GraduationCap, Briefcase, Trophy 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AIDescriptionGeneratorDialog from "@/components/AIDescriptionGeneratorDialog";
import { AI_PROMPT_PRESETS } from "@/config/aiPromptPresets";
import { useAuth } from "@/contexts/use-auth";
import { useEffect, useRef, useState, type ComponentType, type Dispatch, type SetStateAction } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";

// ==========================================
// TYPES & CONSTANTS
// ==========================================
const emptySkillRow = "";
type SkillSectionRow = { title: string; skills: string[]; };
type ExperienceRow = { role: string; company: string; location: string; date: string; bullets: string; };
type AchievementRow = { title: string; date: string; bullets: string; };
type EducationRow = { degree: string; specialization: string; college: string; location: string; endDate: string; grade: string; };

const emptyExperienceRow: ExperienceRow = { role: "", company: "", location: "", date: "", bullets: "" };
const emptyAchievementRow: AchievementRow = { title: "", date: "", bullets: "" };
const emptyEducationRow: EducationRow = { degree: "", specialization: "", college: "", location: "", endDate: "", grade: "" };

const defaultSkillSections = (): SkillSectionRow[] => [
  { title: "Communication", skills: [emptySkillRow] },
  { title: "Technical", skills: [emptySkillRow] },
  { title: "Collaboration", skills: [emptySkillRow] },
  { title: "Leadership", skills: [emptySkillRow] }
];

// ==========================================
// UTILITIES
// ==========================================
const normalizeSkillSections = (items?: SkillSectionRow[]) => items && items.length ? items.map((item, index) => ({ title: item.title?.trim() || defaultSkillSections()[index % 4].title, skills: item.skills && item.skills.length ? item.skills : [emptySkillRow] })) : defaultSkillSections();
const normalizeExperienceRows = (items?: ExperienceRow[]) => (items && items.length ? items : [emptyExperienceRow]);
const normalizeAchievementRows = (items?: AchievementRow[]) => (items && items.length ? items : [emptyAchievementRow]);
const normalizeEducationRows = (items?: EducationRow[]) => (items && items.length ? items : [emptyEducationRow]);
const parseLines = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const unique = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const buildSettingsSnapshot = (payload: {
  displayName: string;
  phone: string;
  about: string;
  customDomain: string;
  linkedInUrl: string;
  githubUrl: string;
  leetCodeId: string;
  geeksForGeeksId: string;
  educationRows: EducationRow[];
  skillSections: SkillSectionRow[];
  experienceRows: ExperienceRow[];
  achievementRows: AchievementRow[];
}) =>
  JSON.stringify(payload);

type GeneratorTarget =
  | { kind: "experience"; index: number }
  | { kind: "achievement"; index: number }
  | null;

// ==========================================
// MAIN COMPONENT
// ==========================================
const SettingsPage = () => {
  const { backendUser, idToken, refreshProfile } = useAuth();
  
  // State
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [leetCodeId, setLeetCodeId] = useState("");
  const [geeksForGeeksId, setGeeksForGeeksId] = useState("");
  const [educationRows, setEducationRows] = useState<EducationRow[]>([emptyEducationRow]);
  const [skillSections, setSkillSections] = useState<SkillSectionRow[]>(defaultSkillSections());
  const [experienceRows, setExperienceRows] = useState<ExperienceRow[]>([emptyExperienceRow]);
  const [achievementRows, setAchievementRows] = useState<AchievementRow[]>([emptyAchievementRow]);
  const [saving, setSaving] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatorTarget, setGeneratorTarget] = useState<GeneratorTarget>(null);
  const baselineSnapshotRef = useRef<string>("");
  const isHydratedRef = useRef(false);
  const hasShownUnsavedToastRef = useRef(false);

  // Load Data
  useEffect(() => {
    const nextDisplayName = backendUser?.displayName ?? "";
    const nextPhone = backendUser?.phone ?? "";
    const nextAbout = backendUser?.about ?? "";
    const nextCustomDomain = backendUser?.customDomain ?? "";
    const nextLinkedInUrl = backendUser?.linkedInUrl ?? "";
    const nextGithubUrl = backendUser?.githubUrl ?? "";
    const nextLeetCodeId = backendUser?.leetCodeId ?? "";
    const nextGeeksForGeeksId = backendUser?.geeksForGeeksId ?? "";
    const nextEducationRows = normalizeEducationRows(backendUser?.educationEntries?.map((item) => ({ degree: item.degree ?? "", specialization: item.specialization ?? "", college: item.college ?? "", location: item.location ?? "", endDate: item.endDate ?? "", grade: item.grade ?? "" })));
    const nextSkillSections = normalizeSkillSections(backendUser?.skillSections);
    const nextExperienceRows = normalizeExperienceRows(backendUser?.experience?.map((item) => ({ role: item.role ?? "", company: item.company ?? "", location: item.location ?? "", date: item.date ?? "", bullets: (item.bullets ?? []).join("\n") })));
    const nextAchievementRows = normalizeAchievementRows(backendUser?.achievements?.map((item) => ({ title: item.title ?? "", date: item.date ?? "", bullets: (item.bullets ?? []).join("\n") })));

    setDisplayName(nextDisplayName);
    setPhone(nextPhone);
    setAbout(nextAbout);
    setCustomDomain(nextCustomDomain);
    setLinkedInUrl(nextLinkedInUrl);
    setGithubUrl(nextGithubUrl);
    setLeetCodeId(nextLeetCodeId);
    setGeeksForGeeksId(nextGeeksForGeeksId);
    setEducationRows(nextEducationRows);
    setSkillSections(nextSkillSections);
    setExperienceRows(nextExperienceRows);
    setAchievementRows(nextAchievementRows);

    baselineSnapshotRef.current = buildSettingsSnapshot({
      displayName: nextDisplayName,
      phone: nextPhone,
      about: nextAbout,
      customDomain: nextCustomDomain,
      linkedInUrl: nextLinkedInUrl,
      githubUrl: nextGithubUrl,
      leetCodeId: nextLeetCodeId,
      geeksForGeeksId: nextGeeksForGeeksId,
      educationRows: nextEducationRows,
      skillSections: nextSkillSections,
      experienceRows: nextExperienceRows,
      achievementRows: nextAchievementRows
    });
    hasShownUnsavedToastRef.current = false;
    isHydratedRef.current = true;
  }, [backendUser]);

  useEffect(() => {
    if (!isHydratedRef.current) {
      return;
    }

    const currentSnapshot = buildSettingsSnapshot({
      displayName,
      phone,
      about,
      customDomain,
      linkedInUrl,
      githubUrl,
      leetCodeId,
      geeksForGeeksId,
      educationRows,
      skillSections,
      experienceRows,
      achievementRows
    });

    const hasUnsavedChanges = currentSnapshot !== baselineSnapshotRef.current;

    if (hasUnsavedChanges && !hasShownUnsavedToastRef.current) {
      toast.info("Changes detected. Please save your updates.", { id: "settings-unsaved-reminder" });
      hasShownUnsavedToastRef.current = true;
    }

    if (!hasUnsavedChanges) {
      hasShownUnsavedToastRef.current = false;
    }
  }, [displayName, phone, about, customDomain, linkedInUrl, githubUrl, leetCodeId, geeksForGeeksId, educationRows, skillSections, experienceRows, achievementRows]);

  // Handlers: Skills
  const updateSectionTitle = (index: number, title: string) => setSkillSections((c) => c.map((s, i) => (i === index ? { ...s, title } : s)));
  const updateSectionSkill = (sIdx: number, skIdx: number, value: string) => setSkillSections((c) => c.map((s, i) => i !== sIdx ? s : { ...s, skills: s.skills.map((skill, j) => (j === skIdx ? value : skill)) }));
  const addSectionSkill = (sIdx: number) => setSkillSections((c) => c.map((s, i) => (i === sIdx ? { ...s, skills: [...s.skills, emptySkillRow] } : s)));
  const removeSectionSkill = (sIdx: number, skIdx: number) => setSkillSections((c) => c.map((s, i) => { if (i !== sIdx) return s; const next = s.skills.filter((_, j) => j !== skIdx); return { ...s, skills: next.length ? next : [emptySkillRow] }; }));
  const addSkillSection = () => setSkillSections((c) => [...c, { title: "New Section", skills: [emptySkillRow] }]);
  const removeSkillSection = (index: number) => setSkillSections((c) => { const next = c.filter((_, i) => i !== index); return next.length ? next : defaultSkillSections(); });

  // Handlers: Generic Rows
  const updateObjectRow = <T,>(setter: Dispatch<SetStateAction<T[]>>, index: number, patch: Partial<T>) => setter((c) => c.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const addObjectRow = <T,>(setter: Dispatch<SetStateAction<T[]>>, fallback: T) => setter((c) => [...c, fallback]);
  const removeObjectRow = <T,>(setter: Dispatch<SetStateAction<T[]>>, fallback: T, index: number) => setter((c) => { const next = c.filter((_, i) => i !== index); return next.length ? next : [fallback]; });

  // API Actions
  const handleGenerateProfileSummary = async () => {
    if (!idToken) return toast.error("Please sign in again to generate summary");
    setGeneratingSummary(true);
    try {
      const response = await apiRequest<{ profileSummary: string }>("/ai/profile-summary", { method: "POST", token: idToken, body: { tone: "professional", maxWords: 90 } });
      setAbout(response.data.profileSummary || "");
      toast.success("AI profile summary generated. Review and save your settings.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate profile summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSave = async () => {
    if (!idToken) return;
    setSaving(true);
    try {
      const normalizedSkillSections = skillSections.map((s) => ({ title: s.title.trim(), skills: unique(s.skills.flatMap((item) => item.split(",").map((x) => x.trim()).filter(Boolean))) })).filter((s) => s.title || s.skills.length > 0);
      const sectionSkillsByTitle = normalizedSkillSections.map((s) => ({ title: s.title.toLowerCase(), skills: s.skills }));
      const collectByTitle = (keywords: string[]) => unique(sectionSkillsByTitle.filter((s) => keywords.some((k) => s.title.includes(k))).flatMap((s) => s.skills));
      const allSectionSkills = unique(normalizedSkillSections.flatMap((s) => s.skills));

      const skillLanguages = collectByTitle(["language", "languages"]);
      const skillFrameworks = collectByTitle(["framework", "frameworks", "frontend", "backend"]);
      const skillTools = collectByTitle(["tool", "tools", "devops", "platform"]);
      const skillLibraries = collectByTitle(["library", "libraries"]);
      const hasAnyCategorized = skillLanguages.length || skillFrameworks.length || skillTools.length || skillLibraries.length;

      await apiRequest<{ user: unknown }>("/auth/me", {
        method: "PATCH", token: idToken,
        body: {
          displayName, phone, about, customDomain, linkedInUrl, githubUrl, leetCodeId, geeksForGeeksId,
          education: educationRows.map((i) => [i.degree, i.specialization, i.college, i.location, i.endDate, i.grade].filter(Boolean).join(" | ")).filter(Boolean),
          educationEntries: educationRows.map((i) => ({ degree: i.degree.trim(), specialization: i.specialization.trim(), college: i.college.trim(), location: i.location.trim(), endDate: i.endDate.trim(), grade: i.grade.trim() })).filter((i) => i.degree || i.specialization || i.college || i.location || i.endDate || i.grade),
          skillSections: normalizedSkillSections,
          skillLanguages: hasAnyCategorized ? skillLanguages : allSectionSkills,
          skillFrameworks: hasAnyCategorized ? skillFrameworks : [],
          skillTools: hasAnyCategorized ? skillTools : [],
          skillLibraries: hasAnyCategorized ? skillLibraries : [],
          experience: experienceRows.map((i) => ({ role: i.role.trim(), company: i.company.trim(), location: i.location.trim(), date: i.date.trim(), bullets: parseLines(i.bullets) })).filter((i) => i.role || i.company || i.bullets.length > 0),
          achievements: achievementRows.map((i) => ({ title: i.title.trim(), date: i.date.trim(), bullets: parseLines(i.bullets) })).filter((i) => i.title || i.bullets.length > 0)
        }
      });
      await refreshProfile();
      baselineSnapshotRef.current = buildSettingsSnapshot({
        displayName,
        phone,
        about,
        customDomain,
        linkedInUrl,
        githubUrl,
        leetCodeId,
        geeksForGeeksId,
        educationRows,
        skillSections,
        experienceRows,
        achievementRows
      });
      hasShownUnsavedToastRef.current = false;
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getGeneratorConfig = () => {
    if (!generatorTarget) {
      return {
        title: "Generate Description",
        defaultPrompt: AI_PROMPT_PRESETS.settingsExperience,
        context: "",
        onApply: (_value: string) => {}
      };
    }

    if (generatorTarget.kind === "experience") {
      const row = experienceRows[generatorTarget.index] ?? emptyExperienceRow;
      return {
        title: "Generate Experience Points",
        defaultPrompt: AI_PROMPT_PRESETS.settingsExperience,
        context: [
          `Role: ${row.role || "N/A"}`,
          `Company: ${row.company || "N/A"}`,
          `Location: ${row.location || "N/A"}`,
          `Duration: ${row.date || "N/A"}`,
          `Current notes: ${row.bullets || "N/A"}`
        ].join("\n"),
        onApply: (value: string) => updateObjectRow(setExperienceRows, generatorTarget.index, { bullets: value })
      };
    }

    const row = achievementRows[generatorTarget.index] ?? emptyAchievementRow;
    return {
      title: "Generate Achievement Points",
      defaultPrompt: AI_PROMPT_PRESETS.settingsAchievement,
      context: [
        `Achievement title: ${row.title || "N/A"}`,
        `Date: ${row.date || "N/A"}`,
        `Current notes: ${row.bullets || "N/A"}`
      ].join("\n"),
      onApply: (value: string) => updateObjectRow(setAchievementRows, generatorTarget.index, { bullets: value })
    };
  };

  const generatorConfig = getGeneratorConfig();

  // Section Header Component for consistent UI
  const SectionHeader = ({ icon: Icon, title, description }: { icon: ComponentType<{ className?: string }>; title: string; description: string }) => (
    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border/40">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-lg text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="page-shell page-shell-sm space-y-8">
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient mb-2 tracking-tight">Master Profile</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your core data. This feeds into your AI Tailor and Portfolios.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full sm:w-auto glow-primary h-10 px-6 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
          >
            {saving ? "Syncing..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>

      {/* General Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <SectionHeader icon={User} title="Personal Details" description="Your core contact information and summary." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Full Name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-background/50 focus-visible:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-background/50 focus-visible:ring-primary" placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Email</label>
            <Input value={backendUser?.email ?? ""} readOnly className="bg-background/30 text-muted-foreground cursor-not-allowed" />
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="text-xs font-medium text-foreground block">Professional Summary (About)</label>
            <Button type="button" variant="outline" size="sm" onClick={handleGenerateProfileSummary} disabled={generatingSummary || !idToken} className="h-8 text-xs glow-primary hover:text-primary transition-colors">
              <Sparkles className="h-3 w-3 mr-1.5" /> {generatingSummary ? "Generating..." : "Auto-Generate"}
            </Button>
          </div>
          <Textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            className="bg-background/50 focus-visible:ring-primary min-h-[120px] resize-y"
            placeholder="Write a concise professional summary used in generated portfolios and AI resumes."
          />
        </div>
      </motion.div>

      {/* Professional Links */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass rounded-2xl p-6 shadow-sm">
        <SectionHeader icon={Link} title="External Profiles" description="Connect your developer platforms and portfolios." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">LinkedIn URL</label>
            <Input value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} className="bg-background/50 focus-visible:ring-primary" placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">GitHub URL</label>
            <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className="bg-background/50 focus-visible:ring-primary" placeholder="https://github.com/..." />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">LeetCode ID</label>
            <Input value={leetCodeId} onChange={(e) => setLeetCodeId(e.target.value)} className="bg-background/50 focus-visible:ring-primary" placeholder="username" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">GeeksforGeeks ID</label>
            <Input value={geeksForGeeksId} onChange={(e) => setGeeksForGeeksId(e.target.value)} className="bg-background/50 focus-visible:ring-primary" placeholder="username" />
          </div>
        </div>
      </motion.div>

      {/* Skills */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 pb-4 border-b border-border/40 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Skills Matrix</h3>
              <p className="text-xs text-muted-foreground">Categorize your technical and soft skills.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addSkillSection} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" /> Add Category
          </Button>
        </div>
        
        <div className="space-y-5">
          {skillSections.map((section, sectionIndex) => (
            <div key={`skill-section-${sectionIndex}`} className="rounded-xl border border-border/40 bg-background/30 p-5 space-y-4 hover:bg-background/40 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Input value={section.title} onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)} className="w-full sm:max-w-[250px] bg-white/5 font-semibold text-sm border-border/50" placeholder="Category Name" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSkillSection(sectionIndex)} className="hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {section.skills.map((skill, skillIndex) => (
                  <div key={`${sectionIndex}-${skillIndex}`} className="flex items-center gap-2">
                    <Input value={skill} onChange={(e) => updateSectionSkill(sectionIndex, skillIndex, e.target.value)} placeholder={`Skill ${skillIndex + 1}`} className="bg-background/50 text-sm h-9" />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 hover:text-destructive" onClick={() => removeSectionSkill(sectionIndex, skillIndex)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => addSectionSkill(sectionIndex)}>
                <Plus className="h-3 w-3 mr-1" /> Add Skill
              </Button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Experience */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 pb-4 border-b border-border/40 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Work Experience</h3>
              <p className="text-xs text-muted-foreground">List your roles. The AI will tailor bullets to specific JDs.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => addObjectRow(setExperienceRows, { ...emptyExperienceRow })} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" /> Add Role
          </Button>
        </div>

        <div className="space-y-5">
          {experienceRows.map((row, index) => (
            <div key={`experience-${index}`} className="rounded-xl border border-border/40 bg-background/30 p-5 space-y-4 hover:bg-background/40 transition-colors relative group">
              <Button type="button" variant="ghost" size="icon" className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10" onClick={() => removeObjectRow(setExperienceRows, emptyExperienceRow, index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                <Input placeholder="Job Title / Role" value={row.role} onChange={(e) => updateObjectRow(setExperienceRows, index, { role: e.target.value })} className="bg-background/50 font-medium" />
                <Input placeholder="Company Name" value={row.company} onChange={(e) => updateObjectRow(setExperienceRows, index, { company: e.target.value })} className="bg-background/50" />
                <Input placeholder="Location (e.g. Remote, NY)" value={row.location} onChange={(e) => updateObjectRow(setExperienceRows, index, { location: e.target.value })} className="bg-background/50" />
                <Input placeholder="Duration (e.g. Jan 2023 - Present)" value={row.date} onChange={(e) => updateObjectRow(setExperienceRows, index, { date: e.target.value })} className="bg-background/50" />
              </div>
              <Textarea
                value={row.bullets}
                onChange={(e) => updateObjectRow(setExperienceRows, index, { bullets: e.target.value })}
                placeholder="Bullet points (one per line)..."
                className="min-h-[100px] bg-background/50 resize-y"
              />
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setGeneratorTarget({ kind: "experience", index })} className="glow-primary">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate
                </Button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Education */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 pb-4 border-b border-border/40 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Education</h3>
              <p className="text-xs text-muted-foreground">Your academic background and degrees.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => addObjectRow(setEducationRows, { ...emptyEducationRow })} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" /> Add Degree
          </Button>
        </div>

        <div className="space-y-5">
          {educationRows.map((row, index) => (
            <div key={`education-${index}`} className="rounded-xl border border-border/40 bg-background/30 p-5 hover:bg-background/40 transition-colors relative group">
               <Button type="button" variant="ghost" size="icon" className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10" onClick={() => removeObjectRow(setEducationRows, emptyEducationRow, index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                <Input placeholder="Degree (e.g. B.S., MSc)" value={row.degree} onChange={(e) => updateObjectRow(setEducationRows, index, { degree: e.target.value })} className="bg-background/50 font-medium" />
                <Input placeholder="Specialization (e.g. Computer Science)" value={row.specialization} onChange={(e) => updateObjectRow(setEducationRows, index, { specialization: e.target.value })} className="bg-background/50" />
                <Input placeholder="Institution" value={row.college} onChange={(e) => updateObjectRow(setEducationRows, index, { college: e.target.value })} className="bg-background/50" />
                <Input placeholder="Location" value={row.location} onChange={(e) => updateObjectRow(setEducationRows, index, { location: e.target.value })} className="bg-background/50" />
                <Input placeholder="Graduation Date" value={row.endDate} onChange={(e) => updateObjectRow(setEducationRows, index, { endDate: e.target.value })} className="bg-background/50" />
                <Input placeholder="GPA / Grade" value={row.grade} onChange={(e) => updateObjectRow(setEducationRows, index, { grade: e.target.value })} className="bg-background/50" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="glass rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 pb-4 border-b border-border/40 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Achievements & Awards</h3>
              <p className="text-xs text-muted-foreground">Hackathons, certifications, or notable recognitions.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => addObjectRow(setAchievementRows, { ...emptyAchievementRow })} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" /> Add Award
          </Button>
        </div>

        <div className="space-y-5">
          {achievementRows.map((row, index) => (
            <div key={`achievement-${index}`} className="rounded-xl border border-border/40 bg-background/30 p-5 space-y-4 hover:bg-background/40 transition-colors relative group">
              <Button type="button" variant="ghost" size="icon" className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10" onClick={() => removeObjectRow(setAchievementRows, emptyAchievementRow, index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                <Input placeholder="Award Title" value={row.title} onChange={(e) => updateObjectRow(setAchievementRows, index, { title: e.target.value })} className="bg-background/50 font-medium" />
                <Input placeholder="Date (e.g. Oct 2024)" value={row.date} onChange={(e) => updateObjectRow(setAchievementRows, index, { date: e.target.value })} className="bg-background/50" />
              </div>
              <Textarea
                value={row.bullets}
                onChange={(e) => updateObjectRow(setAchievementRows, index, { bullets: e.target.value })}
                placeholder="Details (one per line)..."
                className="min-h-[80px] bg-background/50 resize-y"
              />
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setGeneratorTarget({ kind: "achievement", index })} className="glow-primary">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate
                </Button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Infrastructure / Domain */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="glass rounded-2xl p-6 shadow-sm">
        <SectionHeader icon={Globe} title="Hosting & Domain" description="Manage your custom portfolio web address." />
        <div className="mb-5">
          <label className="text-xs font-medium text-foreground mb-1.5 block">Custom Domain URL</label>
          <Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} className="w-full max-w-md bg-background/50 font-mono focus-visible:ring-primary" placeholder="portfolio.yourname.com" />
        </div>
        <div className="rounded-lg bg-background/50 border border-border/30 p-4 max-w-md">
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> DNS Configuration Status
          </p>
          <div className="space-y-2 font-mono text-[11px] text-muted-foreground bg-black/10 dark:bg-black/40 p-3 rounded-md">
            <p className="flex justify-between"><span>A Record:</span> <span className="text-foreground">185.158.133.1</span></p>
            <p className="flex justify-between border-t border-border/20 pt-2"><span>TXT Record:</span> <span className="text-foreground break-all">verify_portfolio_auth</span></p>
          </div>
        </div>
      </motion.div>

      <AIDescriptionGeneratorDialog
        open={Boolean(generatorTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setGeneratorTarget(null);
          }
        }}
        idToken={idToken}
        title={generatorConfig.title}
        defaultPrompt={generatorConfig.defaultPrompt}
        context={generatorConfig.context}
        onApply={generatorConfig.onApply}
      />

    </div>
  );
};

export default SettingsPage;