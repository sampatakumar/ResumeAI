import type { ReactNode } from "react";
import type { ResumeData } from "./ResumeTypes";
import { getRenderableSkillLines } from "./skillFormat";

export type PreviewLayoutConfig = {
  layout?: "COMPACT" | "EXHAUSTIVE";
  skillFormat?: "INLINE" | "GRID";
  headerScale?: number;
  lineHeight?: number;
  sectionGap?: number;
  maxProjectBullets?: number;
};

const JakeResumePreview = ({ data, config }: { data: ResumeData; config?: PreviewLayoutConfig }) => {
  // Apply Defaults
  const layout = config?.layout || "COMPACT";
  const sectionGap = config?.sectionGap ?? 12;
  const headerScale = config?.headerScale ?? 1;
  const lineHeight = config?.lineHeight ?? 1.15;
  const maxProjectBullets = config?.maxProjectBullets ?? 3;
  const skillFormat = config?.skillFormat ?? "INLINE";

  // Reusable Styles
  const headingClass = "font-bold uppercase border-b border-black pb-[2px] mb-[6px] tracking-[0.06em]";
  const sectionStyle = { marginBottom: `${sectionGap}px` };

  // Data Processing
  const skillLines = getRenderableSkillLines(data);
  const projectItems = (data.projects ?? []).map((item) => ({
    ...item,
    bullets: (item.bullets ?? []).slice(0, maxProjectBullets)
  }));

  // Render Helpers (Returns null if no data, preventing empty sections)
  const renderProfessionalSummary = () => {
    if (!data.professionalSummary?.trim()) return null;
    return (
      <section style={sectionStyle} key="summary">
        <h2 className={headingClass} style={{ fontSize: `${11.8 * headerScale}pt` }}>Professional Summary</h2>
        <p className="text-[10pt]">{data.professionalSummary}</p>
      </section>
    );
  };

  const renderEducation = () => {
    if (!data.education?.length) return null;
    return (
      <section style={sectionStyle} key="education">
        <h2 className={headingClass} style={{ fontSize: `${12 * headerScale}pt` }}>Education</h2>
        {data.education.map((edu, index) => (
          <div key={`edu-${index}`} className="mb-2">
            <div className="flex justify-between font-semibold text-[10.8pt]">
              <span>{edu.school}</span>
              <span>{edu.location}</span>
            </div>
            <div className="flex justify-between italic text-[10.2pt]">
              <span>{[edu.degree, edu.grade].filter(Boolean).join(" - ")}</span>
              <span>{edu.date}</span>
            </div>
          </div>
        ))}
      </section>
    );
  };

  const renderExperience = () => {
    if (!data.experience?.length) return null;
    return (
      <section style={sectionStyle} key="experience">
        <h2 className={headingClass} style={{ fontSize: `${12 * headerScale}pt` }}>Experience</h2>
        {data.experience.map((exp, index) => (
          <div key={`exp-${index}`} className="mb-2.5">
            <div className="flex justify-between font-semibold text-[10.8pt]">
              <span>{exp.role}</span>
              <span>{exp.date}</span>
            </div>
            <div className="flex justify-between italic text-[10.2pt] mb-1">
              <span>{exp.company}</span>
              <span>{exp.location}</span>
            </div>
            {exp.bullets?.length > 0 && (
              <ul className="list-disc ml-5 text-[10pt] space-y-[1px] marker:text-black">
                {exp.bullets.map((bullet, i) => (
                  <li key={`exp-bullet-${index}-${i}`} className="pl-1">{bullet}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    );
  };

  const renderProjects = () => {
    if (!projectItems.length) return null;
    return (
      <section style={sectionStyle} key="projects">
        <h2 className={headingClass} style={{ fontSize: `${12 * headerScale}pt` }}>Projects</h2>
        {projectItems.map((proj, index) => (
          <div key={`proj-${index}`} className="mb-2.5">
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-[10.8pt] leading-tight break-words">{proj.name}</span>
              {(proj.demoUrl || proj.githubUrl) ? (
                <span className="text-[10.2pt] italic whitespace-nowrap shrink-0 flex items-center gap-2">
                  {proj.demoUrl ? (
                    <a href={proj.demoUrl} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Live</a>
                  ) : null}
                  {proj.demoUrl && proj.githubUrl ? <span>|</span> : null}
                  {proj.githubUrl ? (
                    <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">GitHub</a>
                  ) : null}
                </span>
              ) : null}
            </div>
            {proj.technologies && (
              <div className="text-[10.2pt] italic leading-tight mt-0.5 break-words">{proj.technologies}</div>
            )}
            {proj.bullets?.length > 0 && (
              <ul className="list-disc ml-5 text-[10pt] mt-1 space-y-[1px] marker:text-black">
                {proj.bullets.map((bullet, i) => (
                  <li key={`proj-bullet-${index}-${i}`} className="pl-1">{bullet}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    );
  };

  const renderAchievements = () => {
    if (!data.achievements?.length) return null;
    return (
      <section style={sectionStyle} key="achievements">
        <h2 className={headingClass} style={{ fontSize: `${12 * headerScale}pt` }}>Achievements</h2>
        {data.achievements.map((item, index) => (
          <div key={`ach-${index}`} className="mb-2.5">
            <div className="flex justify-between font-semibold text-[10.8pt] gap-3">
              <span className="break-words">{item.title}</span>
              <span className="italic text-[10.2pt] whitespace-nowrap shrink-0">{item.date}</span>
            </div>
            {item.bullets?.length > 0 && (
              <ul className="list-disc ml-5 text-[10pt] mt-1 space-y-[1px] marker:text-black">
                {item.bullets.map((bullet, i) => (
                  <li key={`ach-bullet-${index}-${i}`} className="pl-1">{bullet}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    );
  };

  const renderSkills = () => {
    if (!skillLines.length) return null;
    return (
      <section key="skills">
        <h2 className={headingClass} style={{ fontSize: `${12 * headerScale}pt` }}>Skills</h2>
        {skillFormat === "GRID" ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9.7pt]">
            {skillLines.map((line, index) => (
              <div key={`skill-${index}`} className="break-words">
                {line.label && <strong>{line.label}: </strong>}
                {line.value}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10pt] space-y-[2px]">
            {skillLines.map((line, index) => (
              <p key={`skill-${index}`} className="break-words leading-snug">
                {line.label && <strong>{line.label}: </strong>}
                {line.value}
              </p>
            ))}
          </div>
        )}
      </section>
    );
  };

  // Layout Strategy
  const exhaustiveWithoutExperience = layout !== "COMPACT" && !(data.experience && data.experience.length > 0);
  
  const orderedSections = exhaustiveWithoutExperience
    ? [renderProfessionalSummary(), renderEducation(), renderSkills(), renderProjects(), renderAchievements(), renderExperience()]
    : [renderProfessionalSummary(), renderEducation(), renderExperience(), renderProjects(), renderAchievements(), renderSkills()];

  // Filter out nulls so React doesn't process empty slots
  const finalSections = orderedSections.filter(Boolean);

  return (
    <div
      className="w-full max-w-[8.5in] mx-auto p-[0.5in] bg-white text-black shadow-xl"
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        lineHeight: `${lineHeight}`,
        boxSizing: "border-box" // Ensures padding doesn't blow out the A4 width bounds
      }}
    >
      <header className="text-center mb-4">
        <h1 className="font-bold tracking-[0.01em] leading-none" style={{ fontSize: `${22 * headerScale}pt` }}>
          {data.name || "Your Name"}
        </h1>
        
        {/* Dynamic Contact Line Generation */}
        <div className="flex justify-center gap-x-2 gap-y-1 mt-1 text-[10pt] flex-wrap items-center">
          {[
            data.phone ? <span key="phone">{data.phone}</span> : null,
            data.email ? <a key="email" href={`mailto:${data.email}`} className="underline hover:opacity-80">{data.email}</a> : null,
            data.linkedin ? <a key="linkedin" href={data.linkedin} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">LinkedIn</a> : null,
            data.github ? <a key="github" href={data.github} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">GitHub</a> : null
          ].filter(Boolean).reduce<ReactNode[]>((prev, curr) => {
            if (!prev.length) {
              return [curr];
            }

            return [...prev, <span key={`sep-${prev.length}`} className="px-1">|</span>, curr];
          }, [])}
        </div>
      </header>

      {finalSections}
    </div>
  );
};

export default JakeResumePreview;