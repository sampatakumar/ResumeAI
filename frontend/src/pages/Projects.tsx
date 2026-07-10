import { motion, AnimatePresence } from "framer-motion";
import { Plus, ExternalLink, Github, Trash2, Upload, Pencil, FolderGit2, Code2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/use-auth";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AIDescriptionGeneratorDialog from "@/components/AIDescriptionGeneratorDialog";
import { AI_PROMPT_PRESETS } from "@/config/aiPromptPresets";

// ==========================================
// TYPES
// ==========================================
type ProjectItem = {
  _id: string;
  title: string;
  description: string;
  stack: string[];
  date?: string;
  githubUrl?: string;
  demoUrl?: string;
  source: "manual" | "readme";
  updatedAt: string;
};

const initialForm = {
  title: "",
  description: "",
  stack: "",
  date: "",
  githubUrl: "",
  demoUrl: ""
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const Projects = () => {
  const { idToken } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [readmeUploading, setReadmeUploading] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDescriptionGenerator, setShowDescriptionGenerator] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  // Sort projects by newest first
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [projects]
  );

  const fetchProjects = useCallback(async () => {
    if (!idToken) { setProjects([]); setLoading(false); return; }
    try {
      const response = await apiRequest<{ projects: ProjectItem[] }>("/projects", { token: idToken });
      setProjects(response.data.projects);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  // Handlers
  const openCreateDialog = () => {
    setEditingProjectId(null); setForm(initialForm); setShowAddDialog(true);
  };

  const openEditDialog = (project: ProjectItem) => {
    setEditingProjectId(project._id);
    setForm({
      title: project.title,
      description: project.description,
      stack: project.stack.join(", "),
      date: project.date ?? "",
      githubUrl: project.githubUrl ?? "",
      demoUrl: project.demoUrl ?? ""
    });
    setShowAddDialog(true);
  };

  const handleCreateOrUpdateProject = async () => {
    if (!idToken) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = editingProjectId ? `/projects/${editingProjectId}` : "/projects";
      const method = editingProjectId ? "PATCH" : "POST";

      const response = await apiRequest<{ project: ProjectItem }>(endpoint, {
        method,
        token: idToken,
        body: { title: form.title, description: form.description, stack: form.stack, date: form.date, githubUrl: form.githubUrl, demoUrl: form.demoUrl }
      });

      if (editingProjectId) {
        setProjects((current) => current.map((item) => (item._id === response.data.project._id ? response.data.project : item)));
      } else {
        setProjects((current) => [response.data.project, ...current]);
      }

      setForm(initialForm); setEditingProjectId(null); setShowAddDialog(false);
      toast.success(editingProjectId ? "Project updated successfully" : "Project created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReadmeUpload = async (file: File | null) => {
    if (!idToken || !file) return;
    try {
      setReadmeUploading(true);
      const formData = new FormData(); formData.append("readmeFile", file);
      const response = await apiRequest<{ project: ProjectItem }>("/projects/from-readme", { method: "POST", token: idToken, body: formData });
      setProjects((current) => [response.data.project, ...current]);
      toast.success("Project imported from README");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import README");
    } finally {
      setReadmeUploading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!idToken) return;
    try {
      await apiRequest<{ projectId: string }>(`/projects/${projectId}`, { method: "DELETE", token: idToken });
      setProjects((current) => current.filter((project) => project._id !== projectId));
      toast.success("Project deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete project");
    }
  };

  const handleDeleteAllProjects = async () => {
    if (!idToken || !projects.length || deletingAll) return;

    const confirmed = window.confirm("Delete all projects? This action cannot be undone.");
    if (!confirmed) return;

    try {
      setDeletingAll(true);
      const results = await Promise.allSettled(
        projects.map((project) =>
          apiRequest<{ projectId: string }>(`/projects/${project._id}`, { method: "DELETE", token: idToken })
        )
      );

      const successCount = results.filter((item) => item.status === "fulfilled").length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        setProjects([]);
      }

      if (failedCount === 0) {
        toast.success(`Deleted all ${successCount} projects`);
      } else {
        toast.error(`Deleted ${successCount} projects, ${failedCount} failed`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete all projects");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="page-shell page-shell-xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient mb-2 tracking-tight">Project Portfolio</h1>
            <p className="text-muted-foreground text-base sm:text-lg">Curate and manage the projects featured on your resumes and sites.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              disabled={readmeUploading}
              onClick={() => document.getElementById("readme-upload-input")?.click()}
              className="w-full sm:w-auto bg-background/50 backdrop-blur-md border-border/50 hover:bg-primary/5 hover:text-primary transition-all"
            >
              <Upload className="h-4 w-4 mr-2" /> {readmeUploading ? "Analyzing..." : "Import README"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDeleteAllProjects()}
              disabled={deletingAll || !projects.length}
              className="w-full sm:w-auto hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              <Trash2 className="h-4 w-4 mr-2" /> {deletingAll ? "Deleting..." : "Delete All"}
            </Button>
            <Button variant="hero" onClick={openCreateDialog} className="w-full sm:w-auto glow-primary">
              <Plus className="h-4 w-4 mr-2" /> Add Project
            </Button>
            <input
              id="readme-upload-input" type="file" accept=".md,.markdown,.txt" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0] ?? null; void handleReadmeUpload(file); e.currentTarget.value = ""; }}
            />
          </div>
        </div>
      </motion.div>

      {/* Projects Grid */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="glass h-64 rounded-2xl animate-pulse bg-card/20" />
            ))}
          </div>
        ) : sortedProjects.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-16 text-center flex flex-col items-center justify-center border-dashed border-2 border-border/50">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <FolderGit2 className="h-10 w-10 text-primary opacity-80" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6">Start building your portfolio. Add a project manually or quickly import one using a GitHub README.md file.</p>
            <Button variant="hero" onClick={openCreateDialog} className="glow-primary">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Project
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden" animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          >
            <AnimatePresence>
              {sortedProjects.map((project) => (
                <motion.div
                  key={project._id}
                  layout
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -5 }}
                  className="glass rounded-2xl p-6 flex flex-col group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                >
                  {/* Subtle Background Glow on Hover */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none" />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="pr-8">
                      <h3 className="font-bold text-lg text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">{project.title}</h3>
                      <div className="flex items-center gap-2">
                        {project.source === "readme" ? (
                          <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20 px-1.5 py-0">README Imported</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-muted/20 text-muted-foreground border-border/40 px-1.5 py-0">Manual Entry</Badge>
                        )}
                        {project.date && <span className="text-[11px] text-muted-foreground font-medium">{project.date}</span>}
                      </div>
                    </div>
                    
                    {/* Action Menu (Visible on Hover) */}
                    <div className="flex items-center gap-1 sm:absolute sm:top-0 sm:right-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-md rounded-lg border border-border/50 p-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/20 hover:text-primary" onClick={() => openEditDialog(project)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive" onClick={() => handleDeleteProject(project._id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-3 flex-1 relative z-10">
                    {project.description}
                  </p>

                  {/* Footer: Tech Stack & Links */}
                  <div className="mt-auto relative z-10 space-y-4">
                    <div className="flex flex-wrap gap-1.5">
                      {project.stack.map((tech) => (
                        <Badge key={`${project._id}-${tech}`} variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-transparent transition-colors">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border/40">
                      <div className="flex gap-2">
                        {project.githubUrl && (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80" onClick={() => window.open(project.githubUrl, "_blank", "noopener,noreferrer")}>
                            <Github className="h-4 w-4 mr-1.5" /> Code
                          </Button>
                        )}
                        {project.demoUrl && (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80" onClick={() => window.open(project.demoUrl, "_blank", "noopener,noreferrer")}>
                            <ExternalLink className="h-4 w-4 mr-1.5" /> Live Demo
                          </Button>
                        )}
                      </div>
                      <Code2 className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="glass border-border/50 w-[calc(100vw-1rem)] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingProjectId ? "Edit Project Details" : "Add New Project"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground ml-1">Project Title <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. ScholarSync" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} className="bg-background/50 focus-visible:ring-primary" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground ml-1">Timeline (Optional)</label>
                <Input placeholder="e.g. Jan 2026 - Present" value={form.date} onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))} className="bg-background/50 focus-visible:ring-primary" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-foreground ml-1">Description <span className="text-destructive">*</span></label>
                <Button type="button" variant="outline" size="sm" className="h-8 glow-primary" onClick={() => setShowDescriptionGenerator(true)}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate
                </Button>
              </div>
              <Textarea placeholder="Explain what the project does, the problem it solves, and your specific contributions..." value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className="min-h-[120px] bg-background/50 focus-visible:ring-primary resize-y" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground ml-1">Tech Stack</label>
              <Input placeholder="Comma separated (e.g. React, Node.js, LangChain)" value={form.stack} onChange={(e) => setForm((c) => ({ ...c, stack: e.target.value }))} className="bg-background/50 focus-visible:ring-primary font-mono text-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground ml-1">GitHub URL</label>
                <Input placeholder="https://github.com/..." value={form.githubUrl} onChange={(e) => setForm((c) => ({ ...c, githubUrl: e.target.value }))} className="bg-background/50 focus-visible:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground ml-1">Live Demo URL</label>
                <Input placeholder="https://..." value={form.demoUrl} onChange={(e) => setForm((c) => ({ ...c, demoUrl: e.target.value }))} className="bg-background/50 focus-visible:ring-primary" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleCreateOrUpdateProject} disabled={submitting} className="glow-primary">
              {submitting ? "Saving Data..." : editingProjectId ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AIDescriptionGeneratorDialog
        open={showDescriptionGenerator}
        onOpenChange={setShowDescriptionGenerator}
        idToken={idToken}
        title="Generate Project Description"
        defaultPrompt={AI_PROMPT_PRESETS.projectDescription}
        context={[
          `Project title: ${form.title || "N/A"}`,
          `Tech stack: ${form.stack || "N/A"}`,
          `Timeline: ${form.date || "N/A"}`,
          `Current description: ${form.description || "N/A"}`
        ].join("\n")}
        onApply={(nextValue) => setForm((current) => ({ ...current, description: nextValue }))}
      />
    </div>
  );
};

export default Projects;