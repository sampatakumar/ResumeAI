import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, ChevronRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/use-auth";
import { apiRequest } from "@/lib/api";
import JakeResumePreview from "@/components/resume/JakeResumePreview";
import { jsPDF } from "jspdf";
import type { Achievement, Education, Experience, Project, ResumeData } from "@/components/resume/ResumeTypes";
import { getRenderableSkillLines } from "@/components/resume/skillFormat";

// ==========================================
// TYPES & INTERFACES
// ==========================================
type ResumeItem = {
  _id: string;
  title: string;
  content: string;
  format: "PDF" | "DOCX" | "TXT" | "TEX" | "IMAGE";
  originalFileName?: string;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
};

type ResumeSaveResponse = { resume: ResumeItem };

type TailorProject = {
  id: string;
  title: string;
  description: string;
  date?: string;
  stack?: string[];
  githubUrl?: string;
  demoUrl?: string;
  bullets?: string[];
};

type TailorExperience = {
  id: string;
  role?: string;
  company?: string;
  location?: string;
  date?: string;
  bullets?: string[];
};

type TailorAchievement = {
  id: string;
  title?: string;
  date?: string;
  bullets?: string[];
};

type BackendUserShape = {
  displayName?: string;
  phone?: string;
  email?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  educationEntries?: { degree?: string; specialization?: string; college?: string; location?: string; endDate?: string; grade?: string; }[];
  education?: string[];
  skillSections?: { title?: string; skills?: string[] }[];
  skillLanguages?: string[];
  skillFrameworks?: string[];
  skillTools?: string[];
  skillLibraries?: string[];
  experience?: { role?: string; company?: string; location?: string; date?: string; bullets?: string[] }[];
  achievements?: { title?: string; date?: string; bullets?: string[] }[];
};

type JdRequirements = {
  primaryTechStack: string[];
  secondarySkills: string[];
  coreResponsibilities: string[];
  atsKeywords: string[];
  seniority: string;
  roleTitle: string;
};

type MatchInsights = {
  currentMatchPercent: number;
  projectedMatchPercent: number;
  missingSkills: string[];
  existingProjectUpgradeSuggestions: { projectId: string; projectTitle: string; suggestions: string[]; }[];
  newProjectSuggestions: { title: string; focusSkills: string[]; rationale: string; }[];
  gapSummary: string[];
};

type TailorTwoStageResponse = {
  tailoredJson: {
    optimizedSkills: { finalOrdered: string[]; };
    optimizedProjects: TailorProject[];
    selectedExperiences: TailorExperience[];
    selectedAchievements: TailorAchievement[];
    summaryNotes: string[];
    matchInsights?: MatchInsights;
  };
  jdAnalysisUsed: JdRequirements;
};

type TailorInputOptions = {
  projects: TailorProject[];
  experiences: TailorExperience[];
  achievements: TailorAchievement[];
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const uniqueStrings = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const cleanResumeText = (value: string) => value
  .replace(/^\s*[-*•]\s*/, "")
  .replace(/^\s*(situation|task|action|result)\s*:\s*/i, "")
  .replace(/^\s*(s|t|a|r)\s*:\s*/i, "")
  .replace(/\s+/g, " ")
  .trim();

const compactBullets = (items: string[], maxCount = 3) => uniqueStrings(items.map(cleanResumeText).filter(Boolean)).slice(0, maxCount);
const compactProjectTechnologies = (tech: string) => uniqueStrings(tech.split(/[,/|]/).map(cleanResumeText).filter(Boolean)).slice(0, 4).join(", ");
const compactProjectTitle = (title: string) => cleanResumeText(title).replace(/\s*\|\s*$/, "");
const compactProjectDescription = (desc: string) => cleanResumeText(desc).replace(/\.$/, "");
const aiTailorDebug = (event: string, payload?: unknown) => {
  console.info(`[resume-debug][ai-tailor] ${event}`, payload ?? {});
};

// ==========================================
// PDF GENERATION LOGIC
// ==========================================
const ensurePdfY = (doc: jsPDF, y: number) => {
  if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); return 36; }
  return y;
};

const pdfSerifFontFamily = "times";
const ensurePdfSerifFont = async (doc: jsPDF) => {
  // jsPDF natively supports 'times' across all clients so we don't need to bloat the download with TTFs
};

const generateResumePdfBlob = async (data: ResumeData) => {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  await ensurePdfSerifFont(doc);
  let y = 36; const left = 36; const contentWidth = 540; const centerX = doc.internal.pageSize.getWidth() / 2;

  const writeLine = (text: string, x = left, lh = 14) => { y = ensurePdfY(doc, y); doc.text(text, x, y); y += lh; };
  const writeWrapped = (text: string, x = left, w = contentWidth, lh = 14) => doc.splitTextToSize(text, w).forEach((line: string) => writeLine(line, x, lh));
  const writeLeftRight = (leftText: string, rightText?: string, lh = 14) => {
    const right = (rightText ?? "").trim();
    const rightWidth = right ? doc.getTextWidth(right) : 0;
    const leftWidth = right ? Math.max(140, contentWidth - rightWidth - 12) : contentWidth;
    const leftLines = doc.splitTextToSize(leftText || "", leftWidth);
    if (!leftLines.length && right) { y = ensurePdfY(doc, y); doc.text(right, left + contentWidth, y, { align: "right" }); y += lh; return; }
    leftLines.forEach((line: string, i: number) => { y = ensurePdfY(doc, y); doc.text(line, left, y); if (i === 0 && right) doc.text(right, left + contentWidth, y, { align: "right" }); y += lh; });
  };
  const writeSectionTitle = (title: string) => {
    y += 10; y = ensurePdfY(doc, y); doc.setFont(pdfSerifFontFamily, "bold"); doc.setFontSize(11.5); doc.text(title.toUpperCase(), left, y);
    y += 8; y = ensurePdfY(doc, y); doc.setLineWidth(0.8); doc.line(left, y, left + contentWidth, y);
    y += 12; doc.setFont(pdfSerifFontFamily, "normal"); doc.setFontSize(10);
  };

  doc.setFont(pdfSerifFontFamily, "bold"); doc.setFontSize(22); y = ensurePdfY(doc, y); doc.text(data.name || "Candidate", centerX, y, { align: "center" }); y += 22;
  doc.setFont(pdfSerifFontFamily, "normal"); doc.setFontSize(10);

  const contactLine = [data.phone, data.email, data.linkedin, data.github].filter(Boolean).join(" | ");
  if (contactLine) { doc.splitTextToSize(contactLine, contentWidth).forEach((line: string) => { y = ensurePdfY(doc, y); doc.text(line, centerX, y, { align: "center" }); y += 13; }); y += 2; }

  if (data.education?.length) { writeSectionTitle("Education"); data.education.forEach((item) => { doc.setFont(pdfSerifFontFamily, "bold"); writeLeftRight(item.school || "", item.location || "", 13); doc.setFont(pdfSerifFontFamily, "italic"); writeLeftRight([item.degree, item.grade].filter(Boolean).join(" - "), item.date || "", 13); doc.setFont(pdfSerifFontFamily, "normal"); y += 2; }); }
  if (data.experience?.length) { writeSectionTitle("Experience"); data.experience.forEach((item) => { doc.setFont(pdfSerifFontFamily, "bold"); doc.setFontSize(10.5); writeLeftRight(item.role || "", item.date || "", 13); doc.setFont(pdfSerifFontFamily, "italic"); doc.setFontSize(10); writeLeftRight(item.company || "", item.location || "", 12); doc.setFont(pdfSerifFontFamily, "normal"); doc.setFontSize(9.7); item.bullets.forEach((b) => writeWrapped(`- ${b}`, left + 14, contentWidth - 14, 12)); y += 1; }); }
  if (data.projects?.length) { writeSectionTitle("Projects"); data.projects.forEach((item) => { doc.setFont(pdfSerifFontFamily, "bold"); doc.setFontSize(10.5); writeLeftRight(item.name || "", item.date || "", 13); if (item.technologies) { doc.setFont(pdfSerifFontFamily, "italic"); doc.setFontSize(10); writeWrapped(item.technologies, left, contentWidth, 11); } doc.setFont(pdfSerifFontFamily, "normal"); doc.setFontSize(9.7); item.bullets.forEach((b) => writeWrapped(`- ${b}`, left + 14, contentWidth - 14, 12)); y += 2; }); }
  if (data.achievements?.length) { writeSectionTitle("Achievements"); data.achievements.forEach((item) => { doc.setFont(pdfSerifFontFamily, "bold"); doc.setFontSize(10.5); writeLeftRight(item.title || "", item.date || "", 13); doc.setFont(pdfSerifFontFamily, "normal"); doc.setFontSize(9.7); item.bullets.forEach((b) => writeWrapped(`- ${b}`, left + 14, contentWidth - 14, 12)); y += 1; }); }
  
  const skillLines = getRenderableSkillLines(data);
  if (skillLines.length) { writeSectionTitle("Skills"); doc.setFont(pdfSerifFontFamily, "normal"); doc.setFontSize(9.7); skillLines.forEach((line) => { writeWrapped(line.label ? `${line.label}: ${line.value}` : line.value, left, contentWidth, 12); }); }

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
};

const buildBaseResumeData = (user: BackendUserShape | null): ResumeData => ({
  name: user?.displayName || "", phone: user?.phone || "", email: user?.email || "", linkedin: user?.linkedInUrl || "", github: user?.githubUrl || "",
  education: (user?.educationEntries || []).length ? (user?.educationEntries || []).map((i) => ({ school: i.college || "", location: i.location || "", degree: [i.degree, i.specialization].filter(Boolean).join(", "), date: i.endDate || "", grade: i.grade || "" })) : (user?.education || []).map((i) => ({ school: i, location: "", degree: "", date: "", grade: "" })),
  experience: (user?.experience || []).map((i) => ({ role: i.role || "", company: i.company || "", location: i.location || "", date: i.date || "", bullets: i.bullets || [] })),
  projects: [],
  achievements: (user?.achievements || []).map((i) => ({ title: i.title || "", date: i.date || "", bullets: i.bullets || [] })),
  skills: { languages: user?.skillLanguages || [], frameworks: user?.skillFrameworks || [], tools: user?.skillTools || [], libraries: user?.skillLibraries || [] },
  skillSections: (user?.skillSections || []).map((s) => ({ title: s.title || "", skills: s.skills || [] }))
});

const groupBlockFragments = <T extends { id: string; role?: string; title?: string; company?: string; location?: string; date?: string; bullets?: string[] }>(items: T[]) => {
  const grouped: Array<{ id: string; head: T | null; bullets: string[] }> = [];
  for (const item of items) {
    const hasHeading = Boolean((item.role || item.title || item.company || item.location || item.date || "").trim());
    const normalizedBullets = Array.isArray(item.bullets) ? item.bullets.filter(Boolean) : [];
    const looksLikeBulletOnly = !hasHeading || ((item.role || item.title || "").trim().startsWith("-") && !item.company && !item.date);

    if (looksLikeBulletOnly && grouped.length) { grouped[grouped.length - 1].bullets.push(...normalizedBullets); if (!grouped[grouped.length - 1].head) grouped[grouped.length - 1].head = item; continue; }
    grouped.push({ id: item.id, head: item, bullets: normalizedBullets });
  }
  return grouped.map((group) => ({ id: group.id, head: group.head, bullets: uniqueStrings(group.bullets) }));
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const AiTailor = () => {
  const { idToken, backendUser } = useAuth();
  const [jd, setJd] = useState("");
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [generatedPreview, setGeneratedPreview] = useState<ResumeData | null>(null);
  const [recommendedSkills, setRecommendedSkills] = useState<string[]>([]);
  const [recommendedProjects, setRecommendedProjects] = useState<TailorInputOptions["projects"]>([]);
  const [recommendedExperiences, setRecommendedExperiences] = useState<TailorInputOptions["experiences"]>([]);
  const [recommendedAchievements, setRecommendedAchievements] = useState<TailorInputOptions["achievements"]>([]);
  const [matchInsights, setMatchInsights] = useState<MatchInsights | null>(null);
  const [jdResumeComment, setJdResumeComment] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [savingFinal, setSavingFinal] = useState(false);
  const [showSaveTitleDialog, setShowSaveTitleDialog] = useState(false);
  const [saveResumeTitle, setSaveResumeTitle] = useState("");

  const selectedResume = useMemo(() => resumes[0], [resumes]);
  const baseResumeData = useMemo(() => buildBaseResumeData((backendUser as BackendUserShape | null) || null), [backendUser]);
  const groupedRecommendedExperiences = useMemo(() => groupBlockFragments(recommendedExperiences), [recommendedExperiences]);
  const groupedRecommendedAchievements = useMemo(() => groupBlockFragments(recommendedAchievements), [recommendedAchievements]);

  const fetchResumes = useCallback(async () => {
    if (!idToken) { setLoadingResumes(false); setResumes([]); return; }
    try {
      const response = await apiRequest<{ resumes: ResumeItem[] }>("/resumes", { token: idToken });
      setResumes(response.data.resumes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load resumes");
    } finally {
      setLoadingResumes(false);
    }
  }, [idToken]);

  useEffect(() => { void fetchResumes(); }, [fetchResumes]);

  const clearGeneratedState = () => {
    setGeneratedPreview(null); setRecommendedSkills([]); setRecommendedProjects([]);
    setRecommendedExperiences([]); setRecommendedAchievements([]); setMatchInsights(null); setJdResumeComment([]);
  };

  const handleGenerate = async () => {
    if (!idToken) return toast.error("Sign in before generating a tailored resume.");
    if (!jd.trim()) return toast.error("Please paste a job description first.");

    setLoading(true);
    try {
      const response = await apiRequest<TailorTwoStageResponse>("/ai/tailor-two-stage", {
        method: "POST", token: idToken, body: { jobDescription: jd, ...(selectedResume ? { resumeId: selectedResume._id } : {}) }
      });

      const tailored = response.data.tailoredJson;
      const insights = tailored.matchInsights || null;
      const optimizedSkillsOrdered = uniqueStrings(tailored.optimizedSkills?.finalOrdered || []);
      
      const selectedSkillItems = optimizedSkillsOrdered.length ? optimizedSkillsOrdered : baseResumeData.skills?.languages || [];
      const selectedProjectItems: Project[] = (tailored.optimizedProjects || []).map((p) => ({ name: compactProjectTitle(p.title), technologies: compactProjectTechnologies((p.stack || []).join(", ")), date: p.date || "", bullets: compactBullets(p.bullets?.length ? p.bullets : [p.description], 3) }));
      const selectedExperienceItems: Experience[] = (tailored.selectedExperiences || []).map((e) => ({ role: e.role, company: e.company, location: e.location, date: e.date, bullets: compactBullets(e.bullets || [], 3) }));
      const selectedAchievementItems: Achievement[] = (tailored.selectedAchievements || []).map((a) => ({ title: a.title, date: a.date, bullets: compactBullets(a.bullets || [], 3) }));

      setGeneratedPreview({
        ...baseResumeData,
        experience: selectedExperienceItems.length ? selectedExperienceItems : baseResumeData.experience,
        projects: selectedProjectItems.length ? selectedProjectItems : baseResumeData.projects,
        achievements: selectedAchievementItems.length ? selectedAchievementItems : baseResumeData.achievements,
        skills: { languages: selectedSkillItems.length ? selectedSkillItems : baseResumeData.skills?.languages || [], frameworks: baseResumeData.skills?.frameworks || [], tools: baseResumeData.skills?.tools || [], libraries: baseResumeData.skills?.libraries || [] },
        skillSections: baseResumeData.skillSections
      });

      setMatchInsights(insights);
      setRecommendedSkills(uniqueStrings(selectedSkillItems));
      setRecommendedProjects((tailored.optimizedProjects || []).map((p) => ({ id: p.id, title: compactProjectTitle(p.title), description: compactProjectDescription(p.description), stack: uniqueStrings((p.stack || []).map(cleanResumeText)), githubUrl: p.githubUrl || "", demoUrl: p.demoUrl || "", relevanceScore: 1 })));
      setRecommendedExperiences((tailored.selectedExperiences || []).map((e) => ({ ...e, bullets: compactBullets(e.bullets || [], 3), relevanceScore: 1 })));
      setRecommendedAchievements((tailored.selectedAchievements || []).map((a) => ({ ...a, bullets: compactBullets(a.bullets || [], 3), relevanceScore: 1 })));
      
      const notes = [...(insights?.gapSummary || []), ...(tailored.summaryNotes || [])];
      setJdResumeComment(notes.length ? notes : ["AI transformer auto-optimized projects and skills against JD requirements."]);
      
      toast.success("Final preview generated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFinalResume = async () => {
    if (!idToken || !generatedPreview || !saveResumeTitle.trim()) return;
    setSavingFinal(true);
    try {
      const traceId = `ai-tailor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const sectionsCount = [ generatedPreview.education?.length, generatedPreview.experience?.length, generatedPreview.projects?.length, generatedPreview.achievements?.length, (generatedPreview.skills?.languages?.length || generatedPreview.skills?.frameworks?.length) ].filter(Boolean).length;
      aiTailorDebug("handleSaveFinalResume:start", {
        traceId,
        title: saveResumeTitle.trim(),
        sectionsCount,
        educationCount: generatedPreview.education?.length ?? 0,
        experienceCount: generatedPreview.experience?.length ?? 0,
        projectCount: generatedPreview.projects?.length ?? 0,
        achievementCount: generatedPreview.achievements?.length ?? 0,
        skillLanguagesCount: generatedPreview.skills?.languages?.length ?? 0
      });
      
      const pdfBlob = await generateResumePdfBlob(generatedPreview);
      aiTailorDebug("handleSaveFinalResume:pdf-ready", {
        traceId,
        blobSize: pdfBlob.size,
        blobType: pdfBlob.type
      });
      const formData = new FormData();
      formData.append("title", saveResumeTitle.trim());
      formData.append("sections", String(Math.max(sectionsCount, 1)));
      formData.append("resumeFile", new File([pdfBlob], `${saveResumeTitle.trim()}.pdf`, { type: "application/pdf" }));
      formData.append("debugTraceId", traceId);

      const saveResponse = await apiRequest<ResumeSaveResponse>("/resumes", { method: "POST", token: idToken, body: formData });
      aiTailorDebug("handleSaveFinalResume:save-success", {
        traceId,
        savedResume: {
          id: saveResponse.data.resume._id,
          title: saveResponse.data.resume.title,
          format: saveResponse.data.resume.format,
          filePath: saveResponse.data.resume.filePath
        }
      });
      toast.success("Final tailored resume saved as PDF.");
      setShowSaveTitleDialog(false); setSaveResumeTitle(""); await fetchResumes();
    } catch (error) {
      aiTailorDebug("handleSaveFinalResume:error", {
        error: error instanceof Error ? error.message : String(error)
      });
      toast.error(error instanceof Error ? error.message : "Failed to save final resume");
    } finally {
      setSavingFinal(false);
    }
  };

  const openSaveTitleDialog = () => {
    const titleBase = generatedPreview?.name?.trim() || backendUser?.displayName?.trim() || "Candidate";
    setSaveResumeTitle(`${titleBase} - AI Tailored Jake Resume`);
    setShowSaveTitleDialog(true);
  };

  return (
    <div className="page-shell page-shell-lg space-y-8">
      {/* Header Area */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center md:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient mb-2 tracking-tight">AI Resume Tailor</h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
          Instantly bridge the gap between your master profile and the job description. Let the AI build your perfect match.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Column: Inputs & Insights */}
        <motion.div className="lg:col-span-5 space-y-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          
          {/* JD Input Card */}
          <div className="glass rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-1">
              <Wand2 className="w-5 h-5 text-primary" /> Target Job Description
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Paste the full JD to analyze requirements.</p>
            
            <Textarea
              placeholder="e.g. We are looking for a Senior Frontend Developer..."
              className="min-h-[180px] sm:min-h-[220px] bg-background/50 border-border/50 focus:border-primary/50 resize-none mb-4 transition-colors"
              value={jd}
              onChange={(e) => { setJd(e.target.value); clearGeneratedState(); }}
            />
            
            <div className="flex flex-col gap-3">
              <div className="h-10 rounded-lg border border-border/50 bg-background/50 px-3 text-sm text-muted-foreground flex items-center truncate">
                {loadingResumes ? "Loading master data..." : selectedResume ? `Using Profile: ${selectedResume.title}` : "Using Master Profile Data"}
              </div>
              <Button 
                onClick={handleGenerate} 
                disabled={!jd.trim() || loading || loadingResumes}
                className="w-full h-11 glow-primary font-medium text-primary-foreground hover:brightness-110 transition-all"
              >
                {loading ? <Sparkles className="h-5 w-5 mr-2 animate-pulse" /> : <Sparkles className="h-5 w-5 mr-2" />}
                {loading ? "Analyzing & Tailoring..." : "Generate Optimized Resume"}
              </Button>
            </div>
          </div>

          {/* AI Insights Card (Conditional) */}
          <AnimatePresence>
            {generatedPreview && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="glass rounded-2xl p-6 space-y-5"
              >
                <div className="border-b border-border/40 pb-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> AI Match Analysis
                  </h3>
                </div>

                {matchInsights && (
                  <div className="flex justify-between items-center bg-background/40 p-4 rounded-xl border border-border/30">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Current Match</p>
                      <p className="text-2xl font-bold text-foreground">{matchInsights.currentMatchPercent}%</p>
                    </div>
                    <ChevronRight className="text-muted-foreground/30 w-6 h-6" />
                    <div className="text-right">
                      <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">Tailored Match</p>
                      <p className="text-2xl font-bold text-primary">{matchInsights.projectedMatchPercent}%</p>
                    </div>
                  </div>
                )}

                {/* Staggered Insight Lists */}
                <div className="space-y-4">
                  {matchInsights?.missingSkills?.length ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      <p className="text-sm font-medium mb-2 text-foreground">Gap Analysis (Missing Skills)</p>
                      <div className="flex flex-wrap gap-2">
                        {matchInsights.missingSkills.slice(0, 8).map((skill) => (
                          <Badge key={skill} variant="outline" className="bg-destructive/5 text-destructive border-destructive/20">{skill}</Badge>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}

                  {matchInsights?.existingProjectUpgradeSuggestions?.length ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                      <p className="text-sm font-medium mb-2 text-foreground">Project Upgrade Suggestions</p>
                      <div className="space-y-3">
                        {matchInsights.existingProjectUpgradeSuggestions.slice(0, 2).map((item) => (
                          <div key={item.projectId} className="bg-background/40 p-3 rounded-lg border border-border/30">
                            <p className="text-sm font-semibold mb-1">{item.projectTitle}</p>
                            {item.suggestions.slice(0, 2).map((s, i) => (
                              <p key={i} className="text-xs text-muted-foreground flex items-start gap-2 mt-1">
                                <span className="text-primary mt-0.5">•</span> {s}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Column: PDF Preview */}
        <motion.div className="lg:col-span-7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <div className="glass rounded-2xl p-5 sm:p-6 h-full min-h-[380px] lg:min-h-[600px] flex flex-col relative">
            {generatedPreview ? (
              <div className="flex flex-col h-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Live Document Preview</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {recommendedSkills.length} skills & {recommendedProjects.length} projects tailored.
                    </p>
                  </div>
                  <Button onClick={openSaveTitleDialog} disabled={savingFinal} className="w-full sm:w-auto glow-primary">
                    {savingFinal ? "Saving to Cloud..." : "Save PDF to Resumes"}
                  </Button>
                </div>

                <div className="flex-1 bg-white rounded-xl shadow-inner border border-border/30 overflow-hidden relative">
                  <div className="absolute inset-0 overflow-auto p-4 custom-scrollbar">
                     <JakeResumePreview data={generatedPreview} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-primary opacity-80" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Awaiting Instructions</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Paste your job description on the left to generate a dynamically tailored, ATS-optimized PDF resume.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveTitleDialog} onOpenChange={setShowSaveTitleDialog}>
        <DialogContent className="glass border-border/50 w-[calc(100vw-1rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Save Tailored Document</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={saveResumeTitle}
              onChange={(e) => setSaveResumeTitle(e.target.value)}
              placeholder="e.g. Senior Frontend - Google"
              className="bg-background/50 border-border/50 focus-visible:ring-primary"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveFinalResume()}
            />
            <p className="text-xs text-muted-foreground mt-2">
              This will be saved to your dashboard and can be downloaded as a PDF at any time.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaveTitleDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFinalResume} disabled={savingFinal || !saveResumeTitle.trim()} className="glow-primary">
              {savingFinal ? "Saving Document..." : "Save to Cloud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AiTailor;