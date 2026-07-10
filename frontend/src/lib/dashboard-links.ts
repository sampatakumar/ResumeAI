import {
  FileText,
  FolderOpen,
  Globe,
  LayoutDashboard,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type DashboardLink = {
  to: string;
  icon: LucideIcon;
  label: string;
};

export const dashboardLinks: DashboardLink[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/dashboard/resumes", icon: FileText, label: "Resumes" },
  { to: "/dashboard/projects", icon: FolderOpen, label: "Projects" },
  // { to: "/dashboard/tailor", icon: Sparkles, label: "AI Tailor" },
  { to: "/dashboard/portfolios", icon: Globe, label: "Portfolios" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];
