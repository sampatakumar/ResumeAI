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
    <aside className="hidden md:flex w-20 lg:w-64 h-screen sticky top-0 flex-col border-r border-border/40 bg-background/40 backdrop-blur-xl z-40">
      
      {/* Brand Header */}
      <div className="flex items-center justify-center lg:justify-start gap-3 px-4 lg:px-6 h-20 border-b border-border/40">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/80 to-primary/20 flex items-center justify-center shadow-inner">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <span className="hidden lg:inline font-bold text-lg tracking-tight text-foreground">BuildMyResume</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 lg:px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {[...dashboardLinks, ...(backendUser?.email === "shrishpankajguptadbd6@gmail.com" ? [{ to: "/dashboard/admin", icon: ShieldAlert, label: "Analytics" }] : [])].map((link) => {
          const isActive = location.pathname === link.to;
          
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={cn(
                "relative flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 group",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Sliding Active Pill Animation */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <link.icon className={cn(
                "h-4 w-4 relative z-10 transition-colors", 
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="hidden lg:inline relative z-10">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3 lg:p-4 border-t border-border/40 bg-background/20 m-2 rounded-2xl mb-4">
        <div className="flex items-center justify-center lg:justify-between gap-3 mb-3 px-1 lg:px-2">
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary overflow-hidden shrink-0 border border-primary/20">
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
          <ThemeToggle className="hidden lg:inline-flex h-9 w-9 border-border/60 bg-background/50" />
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-center lg:justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-9" 
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