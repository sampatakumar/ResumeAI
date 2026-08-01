import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, LogOut, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/use-auth";
import ThemeToggle from "@/components/ThemeToggle";
import { dashboardLinks } from "@/lib/dashboard-links";

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { backendUser, signOutUser } = useAuth();

  const handleSignOut = async () => {
    await signOutUser();
    navigate("/");
  };

  return (
    <aside className="hidden md:flex w-20 lg:w-64 h-screen sticky top-0 flex-col border-r border-border/40 bg-background shadow-neo-raised z-40">
      
      {/* Brand Header */}
      <div className="flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-6 h-20 border-b border-border/30">
        <div className="h-10 w-10 rounded-xl bg-background shadow-neo-raised flex items-center justify-center border border-primary/20">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <span className="hidden lg:inline font-bold text-lg tracking-tight text-foreground">ResumeAI</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 lg:px-4 py-6 space-y-2.5 overflow-y-auto custom-scrollbar">
        {[...dashboardLinks, ...(backendUser?.email === "sampatakumarsv@gmail.com" ? [{ to: "/dashboard/admin", icon: ShieldAlert, label: "Analytics" }] : [])].map((link) => {
          const isActive = location.pathname === link.to;
          
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={cn(
                "relative flex items-center justify-center lg:justify-start gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Neomorphic Active Inset Pill */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 bg-background shadow-neo-pressed rounded-xl border border-primary/20"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <link.icon className={cn(
                "h-4.5 w-4.5 relative z-10 transition-colors", 
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="hidden lg:inline relative z-10">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3 lg:p-4 border border-border/30 bg-background shadow-neo-pressed m-3 rounded-2xl mb-4">
        <div className="flex items-center justify-center lg:justify-between gap-3 mb-3 px-1 lg:px-2">
          <div className="h-9 w-9 rounded-full bg-background shadow-neo-raised flex items-center justify-center text-sm font-bold text-primary overflow-hidden shrink-0 border border-primary/20">
            {backendUser?.photoURL ? (
              <img src={backendUser.photoURL} alt={backendUser.displayName ?? "User"} className="h-full w-full object-cover" />
            ) : (
              (backendUser?.displayName ?? "U").slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {backendUser?.displayName ?? "Signed in user"}
            </p>
            <p className="text-xs text-muted-foreground truncate font-medium">
              {backendUser?.email ?? "Firebase authenticated"}
            </p>
          </div>
          <ThemeToggle className="hidden lg:inline-flex h-9 w-9" />
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-center lg:justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-9 shadow-neo-raised-sm" 
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">Sign out</span>
        </Button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;