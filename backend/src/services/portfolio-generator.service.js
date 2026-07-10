import { ApiError } from "../utils/ApiError.js";

const MAX_TOTAL_PAYLOAD_BYTES = 15 * 1024 * 1024;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeUrl = (value) => {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  return "";
};

const toDisplayName = (userProfile) => {
  return escapeHtml(userProfile.displayName || userProfile.email || "Portfolio Owner");
};

const getProjectsSection = (projects) => {
  if (!projects.length) {
    return "";
  }

  const items = projects
    .map((project) => {
      const title = escapeHtml(project.title || "Untitled Project");
      const description = escapeHtml(project.description || "");
      const githubUrl = sanitizeUrl(project.githubUrl);
      const demoUrl = sanitizeUrl(project.demoUrl);
      const links = [
        githubUrl ? `<a href=\"${escapeHtml(githubUrl)}\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub</a>` : "",
        demoUrl ? `<a href=\"${escapeHtml(demoUrl)}\" target=\"_blank\" rel=\"noopener noreferrer\">Live Demo</a>` : ""
      ]
        .filter(Boolean)
        .join(" | ");

      return `<article class=\"rounded-xl border border-slate-200 p-5 bg-white/90 shadow-sm\">\n<h3 class=\"text-lg font-semibold\">${title}</h3>\n<p class=\"mt-2 text-slate-600\">${description}</p>\n${links ? `<p class=\"mt-3 text-sm text-sky-700\">${links}</p>` : ""}\n</article>`;
    })
    .join("\n");

  return `<section class=\"mt-10\">\n<h2 class=\"text-2xl font-semibold\">Projects</h2>\n<div class=\"mt-4 grid gap-4 md:grid-cols-2\">${items}</div>\n</section>`;
};

const generateStaticHtml = ({ userProfile, projects, theme }) => {
  const displayName = toDisplayName(userProfile);
  const headline = escapeHtml(userProfile.linkedInUrl ? userProfile.linkedInUrl.replace(/^https?:\/\//i, "") : "Software Developer");

  const themeMap = {
    modern: {
      background: "bg-gradient-to-br from-slate-50 via-sky-50 to-cyan-100",
      accent: "text-sky-700"
    },
    minimal: {
      background: "bg-stone-50",
      accent: "text-stone-700"
    }
  };

  const selectedTheme = themeMap[theme] || themeMap.modern;

  return `<!doctype html>
<html lang=\"en\"> 
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>${displayName} | Portfolio</title>
  <script src=\"https://cdn.tailwindcss.com\"></script>
</head>
<body class=\"${selectedTheme.background} text-slate-900 min-h-screen\">
  <main class=\"max-w-4xl mx-auto px-6 py-12\">
    <header class=\"rounded-2xl bg-white/90 shadow-md border border-slate-200 p-8\">
      <p class=\"text-sm uppercase tracking-[0.2em] ${selectedTheme.accent}\">BuildMyResume Portfolio</p>
      <h1 class=\"text-4xl font-bold mt-2\">${displayName}</h1>
      <p class=\"mt-3 text-slate-600\">${headline}</p>
    </header>

    ${getProjectsSection(projects)}
  </main>
</body>
</html>`;
};

const generateReactApp = ({ userProfile, projects, theme }) => {
  const safeProfile = {
    name: userProfile.displayName || userProfile.email || "Portfolio Owner",
    email: userProfile.email || "",
    linkedInUrl: sanitizeUrl(userProfile.linkedInUrl),
    githubUrl: sanitizeUrl(userProfile.githubUrl)
  };

  const safeProjects = projects.map((project) => ({
    title: project.title || "Untitled Project",
    description: project.description || "",
    githubUrl: sanitizeUrl(project.githubUrl),
    demoUrl: sanitizeUrl(project.demoUrl)
  }));

  const packageJson = {
    name: "portfolio-site",
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1"
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.4.1",
      typescript: "^5.6.3",
      vite: "^5.4.10"
    }
  };

  const appTsx = `import "./styles.css";

const profile = ${JSON.stringify(safeProfile, null, 2)};
const projects = ${JSON.stringify(safeProjects, null, 2)};

function App() {
  return (
    <main className=\"page ${theme === "minimal" ? "minimal" : "modern"}\"> 
      <section className=\"hero\">
        <p className=\"eyebrow\">BuildMyResume Portfolio</p>
        <h1>{profile.name}</h1>
        {profile.email ? <p className=\"subtitle\">{profile.email}</p> : null}
      </section>

      <section className=\"projects\">
        <h2>Projects</h2>
        <div className=\"project-grid\">
          {projects.map((project) => (
            <article key={project.title} className=\"project-card\">
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className=\"links\">
                {project.githubUrl ? (
                  <a href={project.githubUrl} target=\"_blank\" rel=\"noreferrer\">GitHub</a>
                ) : null}
                {project.demoUrl ? (
                  <a href={project.demoUrl} target=\"_blank\" rel=\"noreferrer\">Live Demo</a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
`;

  const stylesCss = `.page {
  min-height: 100vh;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  color: #0f172a;
  padding: 3rem 1.25rem;
  background: ${theme === "minimal" ? "#fafaf9" : "linear-gradient(160deg, #f8fafc, #e0f2fe)"};
}

.hero {
  max-width: 960px;
  margin: 0 auto;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: #0369a1;
}

h1 {
  margin: 0.4rem 0;
  font-size: clamp(2rem, 4vw, 3rem);
}

.subtitle {
  color: #475569;
}

.projects {
  max-width: 960px;
  margin: 2rem auto 0;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
}

.project-card {
  border: 1px solid #cbd5e1;
  border-radius: 0.9rem;
  padding: 1rem;
  background: #fff;
}

.project-card p {
  color: #475569;
}

.links {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
`;

  return {
    "package.json": JSON.stringify(packageJson, null, 2),
    "vite.config.ts": "import { defineConfig } from \"vite\";\nimport react from \"@vitejs/plugin-react\";\n\nexport default defineConfig({ plugins: [react()] });\n",
    "index.html": "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>Portfolio</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.tsx\"></script>\n  </body>\n</html>\n",
    "src/main.tsx": "import React from \"react\";\nimport ReactDOM from \"react-dom/client\";\nimport App from \"./App\";\n\nReactDOM.createRoot(document.getElementById(\"root\")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n",
    "src/App.tsx": appTsx,
    "src/styles.css": stylesCss
  };
};

const toDeploymentFiles = (filesMap) => {
  return Object.entries(filesMap).map(([file, content]) => ({
    file,
    data: Buffer.from(content, "utf8").toString("base64")
  }));
};

const estimatePayloadSize = (files) => {
  return files.reduce((total, currentFile) => total + Buffer.byteLength(currentFile.data, "utf8"), 0);
};

export class GeneratorService {
  static generate({ userProfile, projects, preferences }) {
    const stack = preferences.stack || "static";
    const theme = preferences.theme || "modern";

    if (!["static", "react"].includes(stack)) {
      throw new ApiError(400, "Invalid stack. Expected static or react.");
    }

    if (!["modern", "minimal"].includes(theme)) {
      throw new ApiError(400, "Invalid theme. Expected modern or minimal.");
    }

    const filesMap =
      stack === "static"
        ? {
            "index.html": generateStaticHtml({ userProfile, projects, theme })
          }
        : generateReactApp({ userProfile, projects, theme });

    const files = toDeploymentFiles(filesMap);
    const payloadSize = estimatePayloadSize(files);

    if (payloadSize > MAX_TOTAL_PAYLOAD_BYTES) {
      throw new ApiError(413, "Generated portfolio payload exceeds the supported deployment size limit");
    }

    return {
      files,
      framework: stack === "react" ? "vite" : null,
      payloadSize
    };
  }
}
