// Core
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/contexts/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

// UI Components
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";

// Pages & Layouts
import Landing from "./pages/Landing";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import Resumes from "./pages/Resumes";
import Projects from "./pages/Projects";
import AiTailor from "./pages/AiTailor";
import Portfolios from "./pages/Portfolios";
import SettingsPage from "./pages/SettingsPage";
import AdminAnalytics from "./pages/AdminAnalytics";
import OnboardingFlow from "./pages/OnboardingFlow";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/RequireAuth";

// Optimized React Query Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache data for 5 mins to reduce redundant network requests
      retry: 1,                 // Only retry failed requests once instead of default 3
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          {/* Notifications */}
          <Toaster />
          <Sonner />

          {/* Routing */}
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />

              <Route element={<RequireAuth />}>
                <Route path="/onboarding" element={<OnboardingFlow />} />
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="resumes" element={<Resumes />} />
                  <Route path="projects" element={<Projects />} />
                  {/*<Route path="tailor" element={<AiTailor />} />*/}
                  <Route path="portfolios" element={<Portfolios />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="admin" element={<AdminAnalytics />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
