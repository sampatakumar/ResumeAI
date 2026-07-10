import { motion, AnimatePresence } from "framer-motion";
import { Globe, Github, ExternalLink, Link as LinkIcon, Paintbrush, Code2, Rocket, CheckCircle2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/use-auth";
import { toast } from "sonner";
import { apiRequest, ensureExternalHttpsUrl, getBackendOrigin } from "@/lib/api";

// ==========================================
// TYPES
// ==========================================
type PublishResponse = { success: boolean; jobId?: string; url?: string; customDomain?: string; error?: string; traceId?: string; details?: string; };
type PublishStatusResponse = PublishResponse & { status?: "processing" | "completed" | "failed" };
type GitHubExportResponse = { success: boolean; repoUrl?: string; owner?: string; repoName?: string; branch?: string; pathPrefix?: string; filesUpdated?: number; createdRepo?: boolean; error?: string; details?: string; traceId?: string; };
type DashboardSummary = {
  stats?: {
    projects?: number;
  };
  activePortfolio: { url: string; customDomain: string; projectName: string; publishedAt: string | null } | null;
};

type ThemeOption = "minimal" | "dark" | "glassmorphism" | "cyberpunk";
type FontOption = "Inter" | "JetBrains Mono" | "Sora" | "Space Grotesk";
type AnimationOption = "none" | "subtle" | "rich";

type PublishPreference = { theme: ThemeOption; font: FontOption; animations: AnimationOption; accent: string; notes: string; };
type GitHubExportForm = { token: string; repoOwner: string; repoName: string; branch: string; pathPrefix: string; privateRepo: boolean; };

// ==========================================
// CONSTANTS
// ==========================================
const DEFAULT_PREFERENCE: PublishPreference = { theme: "minimal", font: "Inter", animations: "subtle", accent: "#0ea5e9", notes: "" };
const DEFAULT_GITHUB_EXPORT_FORM: GitHubExportForm = { token: "", repoOwner: "", repoName: "", branch: "main", pathPrefix: "", privateRepo: false };

// ==========================================
// MAIN COMPONENT
// ==========================================
const Portfolios = () => {
  const { idToken, backendUser } = useAuth();
  const savedCustomDomain = (backendUser?.customDomain || "").trim();
  
  // State
  const [preference, setPreference] = useState<PublishPreference>(DEFAULT_PREFERENCE);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [liveUrl, setLiveUrl] = useState("");
  const [activePortfolio, setActivePortfolio] = useState<DashboardSummary["activePortfolio"]>(null);
  
  // GitHub State
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [githubExporting, setGithubExporting] = useState(false);
  const [githubExportResult, setGithubExportResult] = useState<GitHubExportResponse | null>(null);
  const [githubForm, setGithubForm] = useState<GitHubExportForm>(DEFAULT_GITHUB_EXPORT_FORM);

  // Endpoints
  const publishEndpoint = useMemo(() => `${getBackendOrigin()}/portfolio/publish`, []);
  const githubExportEndpoint = useMemo(() => `${getBackendOrigin()}/portfolio/github`, []);
  const resolvedLiveUrl = ensureExternalHttpsUrl(liveUrl);
  const resolvedActivePortfolioUrl = ensureExternalHttpsUrl(activePortfolio?.url || "");

  useEffect(() => {
    const loadSavedPortfolio = async () => {
      if (!idToken) {
        setProjectCount(0);
        setActivePortfolio(null);
        setLiveUrl("");
        return;
      }

      try {
        const response = await apiRequest<DashboardSummary>("/dashboard/summary", { token: idToken });
        const savedPortfolio = response.data.activePortfolio;
        setProjectCount(response.data.stats?.projects ?? 0);

        setActivePortfolio(savedPortfolio || null);

        if (savedPortfolio?.url) {
          setLiveUrl(ensureExternalHttpsUrl(savedPortfolio.url));
        } else {
          setLiveUrl("");
        }
      } catch {
        // Ignore background hydration errors; publish action still works.
      }
    };

    void loadSavedPortfolio();
  }, [idToken]);

  useEffect(() => {
    if (!publishing || publishError) {
      return;
    }

    const startTime = Date.now();
    let pollInFlight = false;
    let settled = false;
    let cancelled = false;

    const pollJobStatus = async () => {
      if (!activeJobId || !idToken || pollInFlight || settled || cancelled) {
        return;
      }

      pollInFlight = true;

      try {
        const res = await fetch(`${getBackendOrigin()}/portfolio/status/${activeJobId}`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        const payload = (await res.json()) as PublishStatusResponse;

        if (cancelled || settled) {
          return;
        }

        if (res.status === 404) {
          settled = true;
          setPublishing(false);
          setActiveJobId(null);
          setPublishError("Deployment status expired or was lost. Please retry publishing.");
          toast.error("Deployment status expired or was lost. Please retry publishing.");
          return;
        }

        if (!res.ok) {
          return;
        }

        if (payload.status === "completed") {
          settled = true;
          const savedUrl = ensureExternalHttpsUrl(payload.url || "");
          const resolvedCustomDomain = payload.customDomain || savedCustomDomain;

          setFakeProgress(100);
          setRetryCount(0);
          setPublishing(false);
          setActiveJobId(null);

          if (savedUrl) {
            setLiveUrl(savedUrl);
            setActivePortfolio((prev) => ({
              url: savedUrl,
              customDomain: resolvedCustomDomain,
              projectName: prev?.projectName || "Portfolio",
              publishedAt: new Date().toISOString()
            }));
          }

          toast.success("Portfolio published successfully");
          return;
        }

        if (payload.status === "failed") {
          settled = true;
          const errorLine = payload.error || "Deployment failed to complete.";
          setPublishing(false);
          setActiveJobId(null);
          setPublishError(errorLine);
          toast.error(errorLine);
        }
      } catch {
        // Ignore transient polling errors and keep polling.
      } finally {
        pollInFlight = false;
      }
    };

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
      setFakeProgress((prev) => Math.min(99, prev + (99 - prev) * 0.05));
      void pollJobStatus();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publishing, publishError, activeJobId, idToken, savedCustomDomain]);

  useEffect(() => {
    if (!publishing && !publishError) {
      setFakeProgress(100);
    }
  }, [publishing, publishError]);

  const publishingStatus = useMemo(() => {
    if (publishError) {
      if (retryCount >= 2) return "Cloudflare seems to be experiencing high latency right now. Your portfolio settings are saved safely—please try deploying again in a few minutes.";
      return publishError;
    }
    if (!publishing && fakeProgress >= 100) return "Deployment Complete";
    
    if (elapsedMs > 60000) return "Cloudflare propagation is taking a bit longer than usual, please don't refresh the page...";
    if (elapsedMs > 45000) return "Finalizing deployment (this can sometimes take an extra moment)...";
    if (elapsedMs > 30000) return "Deploying assets to Cloudflare edge...";
    if (elapsedMs > 15000) return "Resolving npm dependencies and building...";
    return "Generating React components...";
  }, [elapsedMs, publishing, publishError, retryCount, fakeProgress]);

  // Validators
  const canPublish = () => {
    if (!idToken || !backendUser) return false;
    if (!backendUser.displayName?.trim()) return false;
    if (!backendUser.email && !backendUser.displayName) return false;
    
    const hasProjects = projectCount > 0;
    const hasExperience = (backendUser.experience?.length ?? 0) > 0;
    const hasEducation = (backendUser.education?.length ?? 0) > 0 || (backendUser.educationEntries?.length ?? 0) > 0;
    const hasSkills = (backendUser.skillLanguages?.length ?? 0) > 0 || (backendUser.skillFrameworks?.length ?? 0) > 0 || (backendUser.skillTools?.length ?? 0) > 0 || (backendUser.skillLibraries?.length ?? 0) > 0 || (backendUser.skillSections?.length ?? 0) > 0;
    
    return hasProjects || hasExperience || hasEducation || hasSkills;
  };

  // Handlers
  const handlePublish = async () => {
    // Validation checks with specific feedback
    if (!idToken) return toast.error("Please sign in first to publish.");
    if (!backendUser) return toast.error("Profile data is loading. Please wait.");

    const nameStr = (backendUser.displayName || "").trim();
    const emailStr = (backendUser.email || "").trim();

    if (!nameStr && !emailStr) {
      return toast.error("Validation Error: Please add your Name and Email in the Master Profile to proceed.");
    }
    if (!nameStr) {
      return toast.error("Validation Error: Display Name is required in your Master Profile.");
    }
    
    // Check if user has at least one content section
    const hasProjects = projectCount > 0;
    const hasExp = (backendUser.experience?.length ?? 0) > 0;
    const hasEducation = (backendUser.education?.length ?? 0) > 0 || (backendUser.educationEntries?.length ?? 0) > 0;
    const hasSkills = (backendUser.skillLanguages?.length ?? 0) > 0 || (backendUser.skillFrameworks?.length ?? 0) > 0 || (backendUser.skillTools?.length ?? 0) > 0 || (backendUser.skillLibraries?.length ?? 0) > 0 || (backendUser.skillSections?.length ?? 0) > 0;
    
    if (!hasProjects && !hasExp && !hasEducation && !hasSkills) {
      return toast.error("Validation Error: Please fill at least one section (Projects, Experience, Education, or Skills) in your Master Profile before publishing.");
    }

    try {
      setPublishing(true);
      setPublishError(null);
      setFakeProgress(0);
      setElapsedMs(0);
      setLiveUrl("");
      setActiveJobId(null);
      const customDomain = savedCustomDomain;
      
      const preferencePayload = { theme: preference.theme, font: preference.font, animations: preference.animations, accent: preference.accent, notes: preference.notes.trim() };

      const response = await fetch(publishEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ preference: preferencePayload, customDomain })
      });

      const payload = (await response.json()) as PublishResponse;

      if (!response.ok || (!payload.success && !payload.jobId)) {
        throw new Error(payload.details || payload.error || "Failed to start portfolio publishing");
      }

      if (payload.jobId) {
        // Switch into async polling mode
        setActiveJobId(payload.jobId);
        setRetryCount(0);
        toast.success("Build queued. Polling for updates...");
      } else if (payload.url) {
        // Sync response fallback (if backend finishes instantly)
        setFakeProgress(100);
        const savedUrl = ensureExternalHttpsUrl(payload.url || "");
        setLiveUrl(savedUrl || "");
        setActivePortfolio({
          url: savedUrl || "",
          customDomain,
          projectName: activePortfolio?.projectName || "Portfolio",
          publishedAt: new Date().toISOString()
        });
        setRetryCount(0);
        setPublishing(false);
        toast.success("Portfolio published successfully");
      }
    } catch (error) {
      const errLine = error instanceof Error ? error.message : "Something went wrong sending the request.";
      setActiveJobId(null);
      setPublishError(errLine);
      toast.error(errLine);
      setPublishing(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(p => p + 1);
    void handlePublish();
  };

  const handleExportToGitHub = async () => {
    if (!idToken) return toast.error("Please sign in first");
    if (!githubForm.token.trim() || !githubForm.repoName.trim()) return toast.error("GitHub token and repository name are required");

    try {
      setGithubExporting(true);
      const response = await fetch(githubExportEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          token: githubForm.token.trim(), repoOwner: githubForm.repoOwner.trim(), repoName: githubForm.repoName.trim(), branch: githubForm.branch.trim() || "main",
          pathPrefix: githubForm.pathPrefix.trim(), createRepo: true, privateRepo: githubForm.privateRepo,
          preference: { theme: preference.theme, font: preference.font, animations: preference.animations, accent: preference.accent, notes: preference.notes.trim() }
        })
      });

      const payload = (await response.json()) as GitHubExportResponse;
      if (!response.ok || !payload.success) {
        const message = payload.details || payload.error || "Failed to export to GitHub";
        const traceSuffix = payload.traceId ? ` (trace: ${payload.traceId.slice(0, 8)})` : "";
        return toast.error(`${message}${traceSuffix}`);
      }

      setGithubExportResult(payload); setGithubDialogOpen(false);
      toast.success("Portfolio source exported to GitHub successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export portfolio to GitHub");
    } finally {
      setGithubExporting(false);
    }
  };

  const portfolioLabel = activePortfolio?.customDomain || activePortfolio?.url || liveUrl;
  const portfolioPublishedAt = activePortfolio?.publishedAt
    ? new Date(activePortfolio.publishedAt).toLocaleString()
    : "";

  return (
    <div className="page-shell page-shell-md space-y-8">
      {/* Header Area */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient mb-2 tracking-tight">Deploy Portfolio</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">Get Deployed URL for your Personal Portfolio Website.</p>
        </div>
        <Badge variant="secondary" className="self-start md:self-auto bg-primary/10 text-primary border-primary/20 px-3 py-1.5 text-xs font-medium">1-Click away</Badge>
      </motion.div>

      {/* Info Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-primary/20 bg-primary/5 p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Automated Deployment Pipeline</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span className="font-mono bg-background/50 px-1 rounded">Profile Data</span> → 
              <span className="font-mono bg-background/50 px-1 rounded">Deployed URL of your Portfolio website </span>
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-8">

        <AnimatePresence>
          {activePortfolio?.url && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-12 glass rounded-2xl p-5 border-primary/20 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Saved Portfolio</p>
                  <h2 className="text-lg font-bold text-foreground">Your live portfolio is saved</h2>
                  <p className="text-sm text-muted-foreground break-all">{portfolioLabel}</p>
                  {portfolioPublishedAt && (
                    <p className="text-xs text-muted-foreground">Published {portfolioPublishedAt}</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => resolvedActivePortfolioUrl && window.open(resolvedActivePortfolioUrl, "_blank", "noopener,noreferrer")}
                    disabled={!resolvedActivePortfolioUrl}
                    className="w-full sm:w-auto"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" /> Open Live Site
                  </Button>
                  <Button variant="secondary" onClick={() => navigator.clipboard.writeText(portfolioLabel || "").then(() => toast.success("Portfolio link copied"))} disabled={!portfolioLabel} className="w-full sm:w-auto">
                    <LinkIcon className="h-4 w-4 mr-2" /> Copy Link
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main Configuration Column */}
        <motion.div className="lg:col-span-8 space-y-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <div className="glass rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <Paintbrush className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">Design System</h2>
            </div>
            
            <div className="grid gap-5 md:grid-cols-2 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground ml-1">Theme Aesthetic</label>
                <Select value={preference.theme} onValueChange={(v) => setPreference((p) => ({ ...p, theme: v as ThemeOption }))}>
                  <SelectTrigger className="bg-background/50 focus:ring-primary"><SelectValue placeholder="Select theme" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimalist Clean</SelectItem>
                    <SelectItem value="dark">Deep Dark</SelectItem>
                    <SelectItem value="glassmorphism">Glassmorphism (Frosted)</SelectItem>
                    <SelectItem value="cyberpunk">Cyberpunk Neon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground ml-1">Typography</label>
                <Select value={preference.font} onValueChange={(v) => setPreference((p) => ({ ...p, font: v as FontOption }))}>
                  <SelectTrigger className="bg-background/50 focus:ring-primary"><SelectValue placeholder="Select font" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter (Sans-serif)</SelectItem>
                    <SelectItem value="JetBrains Mono">JetBrains Mono (Tech)</SelectItem>
                    <SelectItem value="Sora">Sora (Modern)</SelectItem>
                    <SelectItem value="Space Grotesk">Space Grotesk (Edgy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground ml-1">UI Animations</label>
                <Select value={preference.animations} onValueChange={(v) => setPreference((p) => ({ ...p, animations: v as AnimationOption }))}>
                  <SelectTrigger className="bg-background/50 focus:ring-primary"><SelectValue placeholder="Select animation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Static)</SelectItem>
                    <SelectItem value="subtle">Subtle Fades</SelectItem>
                    <SelectItem value="rich">Rich & Interactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground ml-1">Primary Accent Color</label>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-12 rounded-md overflow-hidden border border-border/50 shrink-0 relative shadow-sm">
                     <input type="color" value={preference.accent} onChange={(e) => setPreference((p) => ({ ...p, accent: e.target.value }))} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                  </div>
                  <Input value={preference.accent} onChange={(e) => setPreference((p) => ({ ...p, accent: e.target.value }))} placeholder="#0ea5e9" className="bg-background/50 font-mono text-sm uppercase focus-visible:ring-primary" />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground ml-1">AI Generation Notes (Optional)</label>
                <Textarea value={preference.notes} onChange={(e) => setPreference((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. Make the hero section high-contrast, emphasize open-source contributions, use a grid layout for projects." className="min-h-[100px] bg-background/50 resize-y focus-visible:ring-primary" />
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-border/40">
              <Button onClick={handlePublish} disabled={publishing || !canPublish()} className="w-full h-12 text-base font-semibold glow-primary shadow-primary/25 hover:brightness-110 transition-all">
                <Rocket className="h-5 w-5 mr-2" /> {publishing ? "Building..." : "Build & Publish"}
              </Button>
            </div>
          </div>

          {/* Deployment Progress Card */}
          <AnimatePresence>
            {(publishing || fakeProgress > 0) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass rounded-2xl p-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {publishError ? (
                      <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center text-destructive text-xs font-bold">!</div>
                    ) : !publishing && fakeProgress >= 100 ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    Deployment Status
                  </h3>
                  <Badge variant="outline" className={publishError ? "text-destructive border-destructive/30" : !publishing && fakeProgress >= 100 ? "text-primary border-primary/30" : "text-muted-foreground"}>
                    {Math.round(fakeProgress)}%
                  </Badge>
                </div>
                <Progress value={fakeProgress} className={`h-2.5 bg-background/50 ${publishError ? "[&>div]:bg-destructive" : ""}`} />
                <div className="mt-4 flex flex-col gap-3">
                  <p className={`text-sm ${publishError ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {publishingStatus}
                  </p>
                  
                  {publishError && (
                    <Button 
                        onClick={handleRetry} 
                        variant={retryCount >= 2 ? "secondary" : "default"}
                        className="self-start mt-2"
                        disabled={retryCount >= 2}
                    >
                        Retry Deployment
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Side Column: Success States & GitHub Export */}
        <motion.div className="lg:col-span-4 space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <AnimatePresence>
            {resolvedLiveUrl && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-6 border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.05)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                
                <div className="mb-5 pb-5 border-b border-border/40">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-1">Your Site is Live!</h3>
                  <p className="text-xs text-muted-foreground">Deployed globally to the edge via Cloudflare.</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-background/60 border border-border/50 rounded-lg p-3 group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 ml-2">Production URL</p>
                    <a href={resolvedLiveUrl} target="_blank" rel="noreferrer" className="text-sm font-mono text-foreground hover:text-primary transition-colors ml-2 break-all line-clamp-2">
                      {resolvedLiveUrl}
                    </a>
                  </div>

                  <Button className="w-full" variant="outline" onClick={() => window.open(resolvedLiveUrl, "_blank", "noopener,noreferrer")}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Visit Live Site
                  </Button>
                  
                  <div className="pt-4 border-t border-border/40">
                    <p className="text-xs text-muted-foreground mb-3 text-center">Want to own the code?</p>
                    <Button className="w-full bg-[#24292e] text-white hover:bg-[#24292e]/90 hover:text-white border-none" onClick={() => setGithubDialogOpen(true)}>
                      <Github className="h-4 w-4 mr-2" /> Push Source to GitHub
                    </Button>
                  </div>
                </div>

                {githubExportResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-lg border border-border/50 bg-background/50 p-3 text-xs">
                    <p className="font-semibold text-foreground flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" /> Source Exported</p>
                    <div className="mt-2 space-y-1 text-muted-foreground">
                      <p className="flex justify-between"><span>Branch:</span> <span>{githubExportResult.branch || "main"}</span></p>
                      <p className="flex justify-between"><span>Files:</span> <span>{githubExportResult.filesUpdated ?? 0}</span></p>
                    </div>
                    <a href={githubExportResult.repoUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center w-full py-1.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors">
                      View Repository <ExternalLink className="w-3 h-3 ml-1.5" />
                    </a>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>

      {/* GitHub Dialog */}
      <Dialog open={githubDialogOpen} onOpenChange={setGithubDialogOpen}>
        <DialogContent className="glass border-border/50 w-[calc(100vw-1rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2"><Github className="w-5 h-5" /> Push to GitHub</DialogTitle>
            <DialogDescription>
              We will generate the entire Vite/React codebase and commit it directly to your repository so you have full ownership.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">GitHub Personal Access Token (PAT)</label>
              <Input type="password" value={githubForm.token} onChange={(e) => setGithubForm((p) => ({ ...p, token: e.target.value }))} placeholder="ghp_..." className="bg-background/50 focus-visible:ring-primary" />
              <p className="text-[10px] text-muted-foreground">Requires `repo` scope permissions.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Repository Owner</label>
                <Input value={githubForm.repoOwner} onChange={(e) => setGithubForm((p) => ({ ...p, repoOwner: e.target.value }))} placeholder="Optional (Defaults to you)" className="bg-background/50 focus-visible:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Repository Name</label>
                <Input value={githubForm.repoName} onChange={(e) => setGithubForm((p) => ({ ...p, repoName: e.target.value }))} placeholder="e.g. my-portfolio" className="bg-background/50 focus-visible:ring-primary" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Branch</label>
                <Input value={githubForm.branch} onChange={(e) => setGithubForm((p) => ({ ...p, branch: e.target.value }))} placeholder="main" className="bg-background/50 focus-visible:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Subfolder Path (Optional)</label>
                <Input value={githubForm.pathPrefix} onChange={(e) => setGithubForm((p) => ({ ...p, pathPrefix: e.target.value }))} placeholder="e.g. frontend" className="bg-background/50 focus-visible:ring-primary" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Visibility</label>
              <Select value={githubForm.privateRepo ? "private" : "public"} onValueChange={(v) => setGithubForm((p) => ({ ...p, privateRepo: v === "private" }))}>
                <SelectTrigger className="bg-background/50 focus:ring-primary"><SelectValue placeholder="Select visibility" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public Repo</SelectItem>
                  <SelectItem value="private">Private Repo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setGithubDialogOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleExportToGitHub} disabled={githubExporting} className="bg-[#24292e] text-white hover:bg-[#24292e]/90 hover:text-white border-none glow-primary">
              {githubExporting ? "Committing Files..." : "Export Source Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Portfolios;
