import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/use-auth";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const RequireAuth = () => {
  const { firebaseUser, backendUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Ambient Background Glow matching the Dashboard */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4 relative z-10"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide">
            Authenticating Session...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/" replace />;
  }

  const isOnboardingRoute = location.pathname === "/onboarding";
  const hasLikelyProfileData = Boolean(
    backendUser &&
      (
        backendUser.about?.trim() ||
        backendUser.phone?.trim() ||
        backendUser.linkedInUrl?.trim() ||
        backendUser.githubUrl?.trim() ||
        backendUser.customDomain?.trim() ||
        (backendUser.educationEntries?.length || 0) > 0 ||
        (backendUser.skillSections?.some((section) => (section.skills || []).length > 0) || false) ||
        (backendUser.experience?.length || 0) > 0 ||
        (backendUser.achievements?.length || 0) > 0
      )
  );

  const needsOnboarding =
    Boolean(backendUser) &&
    !backendUser?.onboardingCompletedAt &&
    !hasLikelyProfileData;

  if (needsOnboarding && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!needsOnboarding && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
