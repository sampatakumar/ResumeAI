import { motion } from "framer-motion";
import { FileText, Globe, Sparkles, TrendingUp, Activity, ArrowRight, Clock } from "lucide-react";
import { useAuth } from "@/contexts/use-auth";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, ensureExternalHttpsUrl } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// ==========================================
// TYPES
// ==========================================
type DashboardSummary = {
  stats: {
    resumes: number;
    tailoredVersions: number;
    portfolios: number;
    viewsThisWeek: number;
  };
  activePortfolio: {
    url: string;
    customDomain: string;
    projectName: string;
    publishedAt: string | null;
  } | null;
  recentActivity: Array<{
    action: string;
    target: string;
    time: string;
  }>;
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const DashboardHome = () => {
  const { backendUser } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await apiRequest<DashboardSummary>("/dashboard/summary");
        setSummary(response.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    void loadSummary();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Master Resumes", value: String(summary?.stats.resumes ?? 0), icon: FileText },
      { label: "Tailored Versions", value: String(summary?.stats.tailoredVersions ?? 0), icon: Sparkles },
      { label: "Active Portfolios", value: String(summary?.stats.portfolios ?? 0), icon: Globe },
      { label: "Views This Week", value: String(summary?.stats.viewsThisWeek ?? 0), icon: TrendingUp }
    ],
    [summary]
  );

  const recentActivity = summary?.recentActivity ?? [];
  const activePortfolio = summary?.activePortfolio ?? null;
  const activePortfolioUrl = ensureExternalHttpsUrl(activePortfolio?.url || "");
  const activePortfolioLabel = activePortfolio?.customDomain || activePortfolioUrl;

  return (
    <div className="page-shell page-shell-xl space-y-8 sm:space-y-10">
      {/* Header Area */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient mb-2 tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Welcome back{backendUser?.displayName ? `, ${backendUser.displayName.split(" ")[0]}` : ""}. Here's your impact this week.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Button variant="hero-outline" onClick={() => navigate("/dashboard/portfolios")} className="w-full sm:w-auto bg-background/50 backdrop-blur-md">
            <Globe className="w-4 h-4 mr-2 text-primary" /> View Sites
          </Button>
          <Button variant="hero" onClick={() => navigate("/dashboard/tailor")} className="w-full sm:w-auto glow-primary">
            <Sparkles className="w-4 h-4 mr-2" /> Tailor Resume
          </Button>
        </div>
      </motion.div>

      {activePortfolioUrl ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass rounded-2xl p-5 sm:p-6 border border-primary/15"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80 mb-2">Active Portfolio</p>
              <h2 className="text-lg font-semibold text-foreground">Saved portfolio link</h2>
              <p className="text-sm text-muted-foreground mt-1 break-all">{activePortfolioLabel}</p>
              {activePortfolio.publishedAt ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Published {new Date(activePortfolio.publishedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard/portfolios")} className="w-full sm:w-auto">Manage Portfolio</Button>
              <Button variant="hero" onClick={() => window.open(activePortfolioUrl, "_blank", "noopener,noreferrer")} className="w-full sm:w-auto glow-primary">
                Open Live Site
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 xl:gap-10">
        {loading ? (
          /* Skeleton Loaders */
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass h-36 rounded-2xl animate-pulse bg-card/20" />
          ))
        ) : (
          stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 + 0.1 }}
              className="glass rounded-2xl p-7 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-default"
            >
              {/* Subtle Background Glow on Hover */}
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none" />
              
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 border border-primary/10">
                  <s.icon className="h-6 w-6 text-primary group-hover:text-primary transition-colors" />
                </div>
              </div>
              
              <div className="relative z-10">
                <p className="text-3xl font-black text-foreground mb-1 tracking-tight">{s.value}</p>
                <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Recent Activity Feed */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl overflow-hidden shadow-sm mt-2"
      >
        <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-border/40 flex items-center justify-between bg-background/20">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg text-foreground">Recent Activity</h2>
          </div>
        </div>
        
        <div className="divide-y divide-border/30 bg-background/10">
          {loading ? (
              <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">Loading activity feed...</div>
          ) : recentActivity.length === 0 ? (
            <div className="p-14 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No recent activity</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">You haven't tailored any resumes or deployed any portfolios recently.</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/tailor")}>
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            recentActivity.map((item, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + (i * 0.05) }}
                key={i} 
                className="px-5 sm:px-7 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-background/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-2 h-2 rounded-full bg-primary/50 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.target}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium sm:ml-6 pl-6 sm:pl-0 border-l sm:border-none border-border/40">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(item.time).toLocaleDateString(undefined, { 
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHome;
