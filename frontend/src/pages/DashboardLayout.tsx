import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { FileText, LogOut, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardLinks } from "@/lib/dashboard-links";
import { useAuth } from "@/contexts/use-auth";
import { Button } from "@/components/ui/button";

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { backendUser, signOutUser } = useAuth();

  const handleSignOut = async () => {
    await signOutUser();
    navigate("/");
  };

  return (
    <div className="flex h-screen min-w-0 bg-background selection:bg-primary/20 selection:text-primary relative overflow-hidden">
      
      {/* Ambient Background Effects (Consistent across the app) */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed inset-0 grid-pattern opacity-[0.15] -z-10 pointer-events-none" />

      <div className="md:hidden fixed top-0 inset-x-0 z-50 border-b border-border/50 glass">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/80 to-primary/20 flex items-center justify-center shadow-inner">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">BuildMyResume</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle className="h-9 w-9 border-border/60 bg-background/50" />
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              className="h-9 w-9 border-border/60 bg-background/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-[1.1rem] w-[1.1rem]" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>
        <nav className="px-3 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {[...dashboardLinks, ...(backendUser?.email === "shrishpankajguptadbd6@gmail.com" ? [{ to: "/dashboard/admin", icon: ShieldAlert, label: "Analytics" }] : [])].map((link) => {
            const isActive = location.pathname === link.to;

            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                  isActive
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/50 bg-background/50 text-muted-foreground"
                )}
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Navigation */}
      <DashboardSidebar />

      {/* Main Content Area */}
      <main className="flex-1 h-full min-w-0 overflow-y-auto overflow-x-hidden relative pt-[7.25rem] md:pt-0">
        {/* AnimatePresence enables exit animations before the new component enters */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-full flex flex-col"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      
    </div>
  );
};

export default DashboardLayout;