import { motion } from "framer-motion";
import { ArrowRight, FileText, Layers, Globe, Sparkles, Zap, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/use-auth";
import ThemeToggle from "@/components/ThemeToggle";

// ==========================================
// CONSTANTS & ANIMATIONS
// ==========================================
const features = [
  { icon: FileText, title: "Smart Resume Parsing", desc: "Upload PDF, DOCX, TXT, TEX, or image resumes and auto-extract profile-ready data." },
  { icon: Sparkles, title: "AI-Powered Tailoring", desc: "Paste a job description and get a perfectly matched resume in seconds." },
  { icon: Layers, title: "Project Portfolio", desc: "Add projects manually or import them from README files to keep your profile current." },
  { icon: Globe, title: "Cloudflare Portfolio Deploy", desc: "Generate and publish your portfolio to Cloudflare Pages with optional custom domains." },
  { icon: Zap, title: "GitHub Source Export", desc: "Export generated portfolio source code directly to GitHub when you need full control." },
  { icon: Download, title: "Resume Export", desc: "Save tailored results as resumes and export polished resume previews as PDF." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] } }),
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const Landing = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, loading, firebaseUser } = useAuth();

  const handleAuthClick = async () => {
    try {
      await signInWithGoogle();
      navigate("/dashboard");
    } catch {
      toast.error("Sign-in failed. Check your Firebase provider settings.");
    }
  };

  const handleGetStarted = async () => {
    if (firebaseUser) {
      navigate("/dashboard");
      return;
    }
    await handleAuthClick();
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      
      {/* Ambient Background Effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed inset-0 grid-pattern opacity-[0.15] -z-10 pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/30 supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary/20 flex items-center justify-center shadow-inner">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="hidden sm:inline font-bold text-xl tracking-tight text-foreground">BuildMyResume</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle className="h-9 w-9 border-border/60 bg-background/40" />
            <Button variant="ghost" size="sm" onClick={handleAuthClick} disabled={loading} className="hidden sm:flex hover:bg-primary/10 hover:text-primary font-medium">
              Log in
            </Button>
            <Button variant="hero" size="sm" onClick={handleGetStarted} disabled={loading} className="glow-primary font-medium">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-32 lg:pt-48 pb-20 sm:pb-24 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto text-center flex flex-col items-center"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-semibold mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(var(--primary),0.15)]"
            >
              <Sparkles className="h-4 w-4" />
              AI-Powered Resume Tailoring & Portfolio Gen
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[1.05] mb-8">
              <span className="text-foreground">Tailor Resumes.</span>
              <br />
              <span className="text-gradient bg-clip-text text-transparent">Deploy Portfolios.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              Upload your master resume, paste any job description, and get a perfectly tailored resume plus a unique portfolio URL — all in seconds.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Button variant="hero" size="lg" className="w-full sm:w-auto text-base px-8 h-14 glow-strong hover:scale-105 active:scale-95 transition-all" onClick={handleGetStarted} disabled={loading}>
                Start Building Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 h-14 bg-background/50 backdrop-blur-md hover:bg-background/80 border-border/50 hover:text-primary transition-all">
                View Live Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-24 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground tracking-tight">Everything you need to land it.</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From intelligent resume parsing to Cloudflare Pages publishing, all seamlessly integrated into one platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-6xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -5 }}
                className="group glass p-8 rounded-2xl border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <f.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3 tracking-tight">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24 lg:py-32 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="relative glass rounded-3xl border border-primary/20 p-8 sm:p-10 md:p-20 text-center overflow-hidden max-w-5xl mx-auto shadow-2xl"
          >
            {/* Internal CTA Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-foreground tracking-tight">Ready to stand out?</h2>
              <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                Build from one master profile, tailor for each job with AI, and publish your portfolio in one focused workflow.
              </p>
              <Button variant="hero" size="lg" className="text-lg px-12 h-16 glow-strong hover:scale-105 active:scale-95 transition-all rounded-full" onClick={handleGetStarted} disabled={loading}>
                Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-muted-foreground mt-6 font-medium">No credit card required. Sign in with Google.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 bg-background/50 backdrop-blur-sm relative z-10 py-10 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <FileText className="h-5 w-5 text-primary" />
            BuildMyResume
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} BuildMyResume. Built with precision.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;