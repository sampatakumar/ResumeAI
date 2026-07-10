
import Groq from "groq-sdk";
import { env } from "../config/env.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

const normalizeUrl = (value) => {
  const input = String(value || "").trim();
  if (!input) return "";
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(input)) return input;
  if (/^www\./i.test(input)) return `https://${input}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(input)) return `https://${input}`;
  return input;
};

const normalizePreferenceInput = (rawPreference) => {
  if (rawPreference && typeof rawPreference === "object") return rawPreference;
  const asString = String(rawPreference || "").trim();
  if (!asString) return {};
  try {
    const parsed = JSON.parse(asString);
    return parsed && typeof parsed === "object" ? parsed : { theme: asString };
  } catch {
    return { theme: asString };
  }
};

const toThemePreset = (rawPreference) => {
  const normalized = normalizePreferenceInput(rawPreference);
  const preference = [normalized.theme, normalized.font, normalized.animations, normalized.accent]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const accent = normalized.accent || "";

  if (preference.includes("cyber") || preference.includes("dark") || preference.includes("hacker")) {
    return {
      name: "obsidian",
      font: "Space Grotesk",
      displayFont: "Bebas Neue",
      background: "#050505",
      panel: "rgba(255,255,255,0.03)",
      panelBorder: "rgba(255,255,255,0.08)",
      text: "#f3f4f6",
      textMuted: "#9ca3af",
      accent: accent || "#10b981",
      accentRgb: "16, 185, 129"
    };
  }

  if (preference.includes("minimal") || preference.includes("clean")) {
    return {
      name: "swiss",
      font: "Inter",
      displayFont: "Inter",
      background: "#ffffff",
      panel: "#f9fafb",
      panelBorder: "#e5e7eb",
      text: "#111827",
      textMuted: "#6b7280",
      accent: accent || "#2563eb",
      accentRgb: "37, 99, 235"
    };
  }

  return {
    name: "luxe",
    font: "Inter",
    displayFont: "Cal Sans, Inter",
    background: "#09090b",
    panel: "rgba(255, 255, 255, 0.02)",
    panelBorder: "rgba(255, 255, 255, 0.05)",
    text: "#fafafa",
    textMuted: "#a1a1aa",
    accent: accent || "#8b5cf6",
    accentRgb: "139, 92, 246"
  };
};

const toAboutSummary = (userProfile) => {
  const directAbout = userProfile?.about;

  if (typeof directAbout === "string") {
    return directAbout.trim();
  }

  if (directAbout && typeof directAbout === "object") {
    const nested = String(directAbout.summary || "").trim();
    if (nested) {
      return nested;
    }
  }

  return String(
    userProfile?.profileSummary ||
      userProfile?.summary ||
      userProfile?.bio ||
      ""
  ).trim();
};

const toProfilePayload = (userProfile) => ({
  basic: {
    name: userProfile?.displayName || userProfile?.email || "Portfolio Owner",
    email: userProfile?.email || "",
    photoURL: normalizeUrl(userProfile?.photoURL || ""),
    headline: userProfile?.headline || "Software Developer"
  },
  about: { summary: toAboutSummary(userProfile) },
  socialProfiles: {
    linkedIn: normalizeUrl(userProfile?.linkedInUrl || ""),
    github: normalizeUrl(userProfile?.githubUrl || ""),
    leetCode: userProfile?.leetCodeId ? normalizeUrl(`https://leetcode.com/${userProfile.leetCodeId}`) : "",
    geeksForGeeks: userProfile?.geeksForGeeksId ? normalizeUrl(`https://www.geeksforgeeks.org/user/${userProfile.geeksForGeeksId}`) : ""
  },
  education: {
    summary: Array.isArray(userProfile?.education) ? userProfile.education : [],
    entries: Array.isArray(userProfile?.educationEntries) ? userProfile.educationEntries : []
  },
  skills: {
    sections: Array.isArray(userProfile?.skillSections)
      ? userProfile.skillSections.map((section) => ({
          title: section?.title || "",
          skills: Array.isArray(section?.skills) ? section.skills : []
        }))
      : [],
    languages: Array.isArray(userProfile?.skillLanguages) ? userProfile.skillLanguages : [],
    frameworks: Array.isArray(userProfile?.skillFrameworks) ? userProfile.skillFrameworks : [],
    tools: Array.isArray(userProfile?.skillTools) ? userProfile.skillTools : [],
    libraries: Array.isArray(userProfile?.skillLibraries) ? userProfile.skillLibraries : []
  },
  experience: Array.isArray(userProfile?.experience) ? userProfile.experience : [],
  achievements: Array.isArray(userProfile?.achievements) ? userProfile.achievements : [],
  projects: Array.isArray(userProfile?.projects)
    ? userProfile.projects.map((project) => ({
        title: project?.title || "",
        description: project?.description || "",
        stack: Array.isArray(project?.stack) ? project.stack : [],
        githubUrl: normalizeUrl(project?.githubUrl || ""),
        demoUrl: normalizeUrl(project?.demoUrl || ""),
        date: project?.date || ""
      }))
    : []
});

const getCoreCss = (t) => `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');

:root {
  --bg: ${t.background};
  --panel: ${t.panel};
  --panel-border: ${t.panelBorder};
  --text: ${t.text};
  --text-muted: ${t.textMuted};
  --accent: ${t.accent};
  --accent-rgb: ${t.accentRgb};
  --font-body: "${t.font}", system-ui, sans-serif;
  --font-display: "${t.displayFont}", system-ui, sans-serif;
  --radius: 12px;
  --radius-lg: 24px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* Layout */
.page-shell { max-width: 1000px; margin: 0 auto; padding: 0 1.5rem 6rem; }

/* Topbar */
.topbar-container {
  position: sticky; top: 1rem; z-index: 100;
  max-width: 1000px; margin: 0 auto 3rem; padding: 0 1.5rem;
}
.topbar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
  padding: 1rem 1.5rem; border-radius: 100px;
  background: var(--panel); border: 1px solid var(--panel-border);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
}
.brand-lockup { font-weight: 700; font-size: 1.1rem; color: var(--text); display: flex; align-items: center; gap: 0.5rem; }
.brand-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.5); }
.nav-links { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.nav-link { font-size: 0.875rem; color: var(--text-muted); text-decoration: none; font-weight: 500; transition: color 0.2s; }
.nav-link:hover { color: var(--accent); }

/* Panels */
.section-panel {
  margin-bottom: 2rem; padding: 3rem;
  background: var(--panel); border: 1px solid var(--panel-border);
  border-radius: var(--radius-lg); scroll-margin-top: 6rem;
}
.section-eyebrow { color: var(--accent); font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
.section-title { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 2.5rem); font-weight: 700; margin-bottom: 2rem; line-height: 1.2; }
.about-text { font-size: 1.1rem; line-height: 1.8; color: var(--text-muted); }

/* Hero */
.hero-shell { min-height: 60vh; display: flex; flex-direction: column; justify-content: center; padding: 4rem 3rem !important; }
.hero-name { font-family: var(--font-display); font-size: clamp(3rem, 8vw, 5rem); font-weight: 700; line-height: 1.1; margin-bottom: 1rem; }
.hero-headline { font-size: clamp(1.1rem, 2vw, 1.25rem); color: var(--text-muted); max-width: 600px; margin-bottom: 2rem; }
.hero-cta-row { display: flex; gap: 1rem; flex-wrap: wrap; }

/* Buttons */
.btn-primary, .btn-ghost { 
  padding: 0.75rem 1.5rem; border-radius: 100px; font-weight: 600; font-size: 0.875rem; text-decoration: none; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem;
}
.btn-primary { background: var(--accent); color: var(--bg); }
.btn-primary:hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 4px 14px rgba(var(--accent-rgb), 0.3); }
.btn-ghost { border: 1px solid var(--panel-border); color: var(--text); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-2px); }

/* Grids & Cards */
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
.card {
  padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--panel-border);
  background: rgba(var(--accent-rgb), 0.02); transition: all 0.2s; height: 100%; display: flex; flex-direction: column;
}
.card:hover { border-color: rgba(var(--accent-rgb), 0.3); transform: translateY(-4px); }

/* Skills */
.skill-group-label { font-size: 0.875rem; font-weight: 600; color: var(--text); margin-bottom: 1rem; }
.skill-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.badge { padding: 0.4rem 0.8rem; border-radius: 100px; font-size: 0.75rem; font-weight: 500; background: rgba(var(--accent-rgb), 0.1); color: var(--accent); border: 1px solid rgba(var(--accent-rgb), 0.2); }

/* Timeline (Experience & Education) */
.timeline-item { padding-left: 2rem; position: relative; padding-bottom: 2rem; }
.timeline-item::before { content: ''; position: absolute; left: 5px; top: 5px; bottom: 0; width: 2px; background: var(--panel-border); }
.timeline-item:last-child::before { display: none; }
.timeline-dot { position: absolute; left: 0; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg); }
.timeline-role { font-weight: 700; font-size: 1.1rem; color: var(--text); }
.timeline-company { color: var(--text-muted); font-size: 0.9rem; margin-top: 0.2rem; }
.timeline-bullets { margin-top: 1rem; padding-left: 1.2rem; color: var(--text-muted); font-size: 0.9rem; }
.timeline-bullets li { margin-bottom: 0.5rem; }

/* Socials / Contact */
.social-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
.social-card {
  display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem;
  border-radius: var(--radius); border: 1px solid var(--panel-border);
  background: rgba(255, 255, 255, 0.01); color: var(--text); text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: all 0.2s;
}
.social-card:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-3px); box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.1); }
.social-arrow { font-size: 1.2rem; opacity: 0.5; transition: all 0.2s; }
.social-card:hover .social-arrow { opacity: 1; transform: translate(2px, -2px); }

@media (max-width: 768px) {
  .section-panel { padding: 2rem 1.5rem; }
  .nav-links { gap: 1rem; justify-content: center; width: 100%; }
}
`;

const buildTemplateFiles = ({ profile, themeCss }) => {
  const files = {
    "package.json": JSON.stringify({
      name: "portfolio-site", private: true, version: "1.0.0", type: "module",
      scripts: { dev: "vite", build: "vite build" },
      dependencies: { react: "^18.3.1", "react-dom": "^18.3.1", "framer-motion": "^11.3.0" },
      devDependencies: { vite: "^5.4.10", "@vitejs/plugin-react": "^4.3.2" }
    }, null, 2),
    "vite.config.js": `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()] });\n`,
    "index.html": `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${profile.basic.name} — Portfolio</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>\n`,
    "src/profile.json": JSON.stringify(profile, null, 2),
    "src/main.jsx": `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App.jsx";\nimport "./theme.generated.css";\nReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);\n`,
    "src/context/ProfileContext.jsx": `import { createContext, useContext } from "react";\nconst ProfileContext = createContext(null);\nexport function ProfileProvider({ data, children }) { return <ProfileContext.Provider value={data}>{children}</ProfileContext.Provider>; }\nexport function useProfile() { return useContext(ProfileContext); }\n`,
    
    "src/App.jsx": `import { ProfileProvider } from "./context/ProfileContext.jsx";
import profileData from "./profile.json";
import { Topbar } from "./components/Topbar.jsx";
import { Hero } from "./components/Hero.jsx";
import { About } from "./components/About.jsx";
import { Skills } from "./components/Skills.jsx";
import { Experience } from "./components/Experience.jsx";
import { Projects } from "./components/Projects.jsx";
import { Education } from "./components/Education.jsx";
import { Achievements } from "./components/Achievements.jsx";
import { SocialLinks } from "./components/SocialLinks.jsx";

export default function App() {
  return (
    <ProfileProvider data={profileData}>
      <Topbar />
      <div className="page-shell">
        <main>
          <Hero />
          <About />
          <Skills />
          <Experience />
          <Projects />
          <Education />
          <Achievements />
          <SocialLinks />
        </main>
      </div>
    </ProfileProvider>
  );
}\n`,

    "src/components/Topbar.jsx": `import { useProfile } from "../context/ProfileContext.jsx";
export function Topbar() {
  const { basic } = useProfile();
  return (
    <div className="topbar-container">
      <nav className="topbar">
        <div className="brand-lockup"><span className="brand-dot" />{basic.name}</div>
        <div className="nav-links">
          <a href="#about" className="nav-link">About</a>
          <a href="#skills" className="nav-link">Skills</a>
          <a href="#experience" className="nav-link">Work</a>
          <a href="#projects" className="nav-link">Projects</a>
          <a href="#contact" className="nav-link">Contact</a>
        </div>
      </nav>
    </div>
  );
}\n`,

    "src/components/Hero.jsx": `import { useProfile } from "../context/ProfileContext.jsx";
export function Hero() {
  const { basic, socialProfiles } = useProfile();
  return (
    <section className="section-panel hero-shell">
      <h1 className="hero-name">{basic.name}</h1>
      <p className="hero-headline">{basic.headline}</p>
      <div className="hero-cta-row">
        {/* Bulletproof Mailto Concatenation */}
        {basic.email && <a href={"mailto:" + basic.email} className="btn-primary">Get in touch ↗</a>}
        {socialProfiles?.github && <a href={socialProfiles.github} target="_blank" rel="noreferrer" className="btn-ghost">GitHub</a>}
        {socialProfiles?.linkedIn && <a href={socialProfiles.linkedIn} target="_blank" rel="noreferrer" className="btn-ghost">LinkedIn</a>}
      </div>
    </section>
  );
}\n`,

    "src/components/About.jsx": `import { useProfile } from "../context/ProfileContext.jsx";
export function About() {
  const { about, profileSummary, summary } = useProfile();
  const resolvedSummary = (typeof about === "string" ? about : about?.summary) || profileSummary || summary || "";
  const normalizedSummary = String(resolvedSummary).trim();
  if(!normalizedSummary) return null;
  return (
    <section id="about" className="section-panel">
      <p className="section-eyebrow">About</p>
      <h2 className="section-title">Who I am</h2>
      <p className="about-text">{normalizedSummary}</p>
    </section>
  );
}\n`,

    "src/components/Skills.jsx": `import { useState } from "react";
import { useProfile } from "../context/ProfileContext.jsx";
export function Skills() {
  const { skills } = useProfile();
  const [showAll, setShowAll] = useState(false);
  
  const categories = [
    { label: "Languages", items: skills.languages },
    { label: "Frameworks", items: skills.frameworks },
    { label: "Tools & Platforms", items: skills.tools },
    { label: "Libraries", items: skills.libraries }
  ].filter(c => c.items?.length);
  
  if(!categories.length) return null;

  const limit = 2; // Show top 2 categories by default
  const visibleCategories = showAll ? categories : categories.slice(0, limit);

  return (
    <section id="skills" className="section-panel">
      <p className="section-eyebrow">Skills</p>
      <h2 className="section-title">What I work with</h2>
      <div className="grid-2">
        {visibleCategories.map(cat => (
          <div key={cat.label}>
            <p className="skill-group-label">{cat.label}</p>
            <div className="skill-tags">{cat.items.map(i => <span key={i} className="badge">{i}</span>)}</div>
          </div>
        ))}
      </div>
      {categories.length > limit && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button onClick={() => setShowAll(!showAll)} className="btn-ghost" style={{ cursor: 'pointer' }}>
            {showAll ? "Show Less" : "See More Skills"}
          </button>
        </div>
      )}
    </section>
  );
}\n`,

    "src/components/Experience.jsx": `import { useState } from "react";
import { useProfile } from "../context/ProfileContext.jsx";
export function Experience() {
  const { experience } = useProfile();
  const [showAll, setShowAll] = useState(false);
  
  if(!experience?.length) return null;

  const limit = 3;
  const visible = showAll ? experience : experience.slice(0, limit);

  return (
    <section id="experience" className="section-panel">
      <p className="section-eyebrow">Experience</p>
      <h2 className="section-title">Where I've worked</h2>
      <div className="timeline">
        {visible.map((item, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot" />
            <p className="timeline-role">{item.role}</p>
            <p className="timeline-company">{item.company} | {item.date}</p>
            {item.bullets && <ul className="timeline-bullets">{item.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
          </div>
        ))}
      </div>
      {experience.length > limit && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button onClick={() => setShowAll(!showAll)} className="btn-ghost" style={{ cursor: 'pointer' }}>
            {showAll ? "Show Less" : "See More Experience"}
          </button>
        </div>
      )}
    </section>
  );
}\n`,

    "src/components/Projects.jsx": `import { useState } from "react";
import { useProfile } from "../context/ProfileContext.jsx";
export function Projects() {
  const { projects } = useProfile();
  const [showAll, setShowAll] = useState(false);

  if(!projects?.length) return null;

  const limit = 4;
  const visible = showAll ? projects : projects.slice(0, limit);

  return (
    <section id="projects" className="section-panel">
      <p className="section-eyebrow">Projects</p>
      <h2 className="section-title">Things I've built</h2>
      <div className="grid-2">
        {visible.map((p, i) => (
          <article key={i} className="card">
            <h3 style={{fontWeight: 700, marginBottom: '0.5rem'}}>{p.title}</h3>
            <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', flex: 1}}>{p.description}</p>
            {p.stack && <div className="skill-tags" style={{marginTop: 'auto', marginBottom: '1rem'}}>{p.stack.map(s => <span key={s} className="badge">{s}</span>)}</div>}
            <div style={{display: 'flex', gap: '1rem', fontSize: '0.875rem'}}>
              {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noreferrer" style={{color: 'var(--text-muted)', textDecoration: 'none'}}>↗ Source</a>}
              {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noreferrer" style={{color: 'var(--text-muted)', textDecoration: 'none'}}>↗ Live Demo</a>}
            </div>
          </article>
        ))}
      </div>
      {projects.length > limit && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button onClick={() => setShowAll(!showAll)} className="btn-ghost" style={{ cursor: 'pointer' }}>
            {showAll ? "Show Less" : "See More Projects"}
          </button>
        </div>
      )}
    </section>
  );
}\n`,

    "src/components/Education.jsx": `import { useProfile } from "../context/ProfileContext.jsx";
export function Education() {
  const { education } = useProfile();
  const entries = education?.entries || [];
  if(!entries.length) return null;

  return (
    <section id="education" className="section-panel">
      <p className="section-eyebrow">Education</p>
      <h2 className="section-title">Academic Background</h2>
      <div className="timeline">
        {entries.map((item, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot" />
            <p className="timeline-role">{item.degree} {item.specialization && \`— \${item.specialization}\`}</p>
            <p className="timeline-company">{item.college} | {item.endDate}</p>
            {item.grade && <p className="timeline-company" style={{marginTop: '0.5rem'}}>Grade: {item.grade}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}\n`,

    "src/components/Achievements.jsx": `import { useState } from "react";
import { useProfile } from "../context/ProfileContext.jsx";
export function Achievements() {
  const { achievements } = useProfile();
  const [showAll, setShowAll] = useState(false);

  if(!achievements?.length) return null;

  const limit = 3;
  const visible = showAll ? achievements : achievements.slice(0, limit);

  return (
    <section id="achievements" className="section-panel">
      <p className="section-eyebrow">Achievements</p>
      <h2 className="section-title">Recognition & Wins</h2>
      <div className="timeline">
        {visible.map((item, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-dot" />
            <p className="timeline-role">{item.title}</p>
            {item.date && <p className="timeline-company">{item.date}</p>}
            {item.bullets && <ul className="timeline-bullets">{item.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
          </div>
        ))}
      </div>
      {achievements.length > limit && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button onClick={() => setShowAll(!showAll)} className="btn-ghost" style={{ cursor: 'pointer' }}>
            {showAll ? "Show Less" : "See More Achievements"}
          </button>
        </div>
      )}
    </section>
  );
}\n`,

    "src/components/SocialLinks.jsx": `import { useProfile } from "../context/ProfileContext.jsx";
export function SocialLinks() {
  const { socialProfiles, basic } = useProfile();
  
  const links = [
    { label: "LinkedIn", href: socialProfiles?.linkedIn },
    { label: "GitHub", href: socialProfiles?.github },
    { label: "LeetCode", href: socialProfiles?.leetCode },
    { label: "GeeksForGeeks", href: socialProfiles?.geeksForGeeks }
  ].filter(l => Boolean(l.href));

  return (
    <section id="contact" className="section-panel">
      <p className="section-eyebrow">Contact</p>
      <h2 className="section-title">Let's connect</h2>
      
      {/* Bulletproof Mailto Concatenation */}
      {basic?.email && (
        <p style={{ fontSize: "1.1rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Reach me at <a href={"mailto:" + basic.email} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>{basic.email}</a>
        </p>
      )}

      {links.length > 0 && (
        <div className="social-grid">
          {links.map(link => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="social-card">
              {link.label}
              <span className="social-arrow">↗</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}\n`
  };

  files["src/theme.generated.css"] = themeCss;
  return files;
};

export const generatePortfolioProject = async (userProfile, userPreference = "", options = {}) => {
  const preference = normalizePreferenceInput(userPreference);
  const themePreset = toThemePreset(preference);
  const profile = toProfilePayload(userProfile || {});

  const themeCss = getCoreCss(themePreset);

  return {
    type: "vite-project",
    filesMap: buildTemplateFiles({ profile, themeCss }),
    profile,
    preference,
    themePreset
  };
};