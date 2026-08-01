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
      
      {/* Ambient Background Effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
      <div className="fixed inset-0 grid-pattern opacity-[0.12] -z-10 pointer-events-none" />

      {/* Responsive Mobile Neomorphic Top Header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background shadow-neo-raised">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-background shadow-neo-raised flex items-center justify-center border border-primary/20">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">ResumeAI</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="h-9 w-9" />
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors shadow-neo-raised-sm"
              title="Sign out"
            >
              <LogOut className="h-[1.1rem] w-[1.1rem]" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>
        <nav className="px-3 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {[...dashboardLinks, ...(backendUser?.email === "sampatakumarsv@gmail.com" ? [{ to: "/dashboard/admin", icon: ShieldAlert, label: "Analytics" }] : [])].map((link) => {
            const isActive = location.pathname === link.to;

            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all duration-200",
                  isActive
                    ? "border-primary/40 bg-background shadow-neo-pressed text-primary font-semibold"
                    : "border-border/40 bg-background shadow-neo-raised-sm text-muted-foreground"
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