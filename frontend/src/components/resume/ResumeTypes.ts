export interface Education {
  school: string;
  location: string;
  degree: string;
  date: string;
  grade?: string;
}

export interface Experience {
  company: string;
  location: string;
  role: string;
  date: string;
  bullets: string[];
}

export interface Project {
  name: string;
  technologies: string;
  date?: string;
  githubUrl?: string;
  demoUrl?: string;
  bullets: string[];
}

export interface Achievement {
  title: string;
  date: string;
  bullets: string[];
}

export interface TechnicalSkills {
  languages?: string[];
  frameworks?: string[];
  tools?: string[];
  libraries?: string[];
}

export interface SkillSection {
  title: string;
  skills: string[];
}

export interface ResumeData {
  name: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  professionalSummary?: string;
  education?: Education[];
  experience?: Experience[];
  projects?: Project[];
  achievements?: Achievement[];
  skills?: TechnicalSkills;
  skillSections?: SkillSection[];
}
