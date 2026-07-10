export type BackendUser = {
  _id?: string;
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  headline?: string;
  phone?: string;
  photoURL: string | null;
  about?: string;
  customDomain?: string;
  notificationsEnabled?: boolean;
  linkedInUrl?: string;
  githubUrl?: string;
  leetCodeId?: string;
  geeksForGeeksId?: string;
  education?: string[];
  educationEntries?: {
    degree: string;
    specialization?: string;
    college: string;
    location?: string;
    endDate?: string;
    grade?: string;
  }[];
  skillLanguages?: string[];
  skillFrameworks?: string[];
  skillTools?: string[];
  skillLibraries?: string[];
  skillSections?: {
    title: string;
    skills: string[];
  }[];
  experience?: {
    role: string;
    company: string;
    location?: string;
    date?: string;
    bullets: string[];
  }[];
  achievements?: {
    title: string;
    date?: string;
    bullets: string[];
  }[];
  onboardingCompletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt: string;
};
