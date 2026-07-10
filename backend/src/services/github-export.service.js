const githubApiBase = "https://api.github.com";

const normalizeRepoPath = (value) =>
  String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");

const encodeGitHubPath = (filePath) =>
  normalizeRepoPath(filePath)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const getHeaders = (token) => {
  if (!token || typeof token !== "string") {
    throw new Error("GitHub token is required");
  }

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(
      typeof payload === "string"
        ? payload || `GitHub request failed with status ${response.status}`
        : payload?.message || `GitHub request failed with status ${response.status}`
    );
    error.statusCode = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
};

const getAuthenticatedLogin = async (token) => {
  const payload = await fetchJson(`${githubApiBase}/user`, {
    headers: getHeaders(token)
  });

  if (!payload?.login) {
    throw new Error("Unable to resolve authenticated GitHub user");
  }

  return payload.login;
};

const ensureRepository = async ({ token, owner, repoName, createRepo = true, privateRepo = false }) => {
  const headers = getHeaders(token);
  const repoUrl = `${githubApiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;

  try {
    const repo = await fetchJson(repoUrl, { headers });
    return {
      owner,
      repoName,
      exists: true,
      htmlUrl: repo.html_url || `https://github.com/${owner}/${repoName}`
    };
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }

    if (!createRepo) {
      throw new Error(`Repository ${owner}/${repoName} does not exist`);
    }

    const authenticatedLogin = await getAuthenticatedLogin(token);

    if (owner !== authenticatedLogin) {
      throw new Error("Repository does not exist and auto-create is only supported for the authenticated GitHub account");
    }

    const createdRepo = await fetchJson(`${githubApiBase}/user/repos`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: repoName,
        private: Boolean(privateRepo),
        auto_init: true,
        has_issues: true,
        has_projects: false,
        has_wiki: false
      })
    });

    return {
      owner,
      repoName,
      exists: false,
      htmlUrl: createdRepo.html_url || `https://github.com/${owner}/${repoName}`
    };
  }
};

const getFileSha = async ({ token, owner, repoName, branch, path }) => {
  const headers = getHeaders(token);
  const fileUrl = `${githubApiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(branch)}`;

  try {
    const payload = await fetchJson(fileUrl, { headers });

    if (payload && !Array.isArray(payload) && payload.sha) {
      return payload.sha;
    }

    return null;
  } catch (error) {
    if (error.statusCode === 404) {
      return null;
    }

    throw error;
  }
};

const putFile = async ({ token, owner, repoName, branch, path, content, message, sha }) => {
  const headers = getHeaders(token);
  const fileUrl = `${githubApiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/contents/${encodeGitHubPath(path)}`;

  const body = {
    message,
    content: Buffer.isBuffer(content) ? content.toString("base64") : Buffer.from(String(content || ""), "utf8").toString("base64"),
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  return fetchJson(fileUrl, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
};

export const pushPortfolioSourceToGitHub = async ({
  token,
  owner,
  repoName,
  branch = "main",
  pathPrefix = "",
  filesMap,
  commitMessage,
  createRepo = true,
  privateRepo = false,
  traceId = ""
}) => {
  if (!repoName || typeof repoName !== "string") {
    throw new Error("GitHub repository name is required");
  }

  if (!filesMap || typeof filesMap !== "object" || !Object.keys(filesMap).length) {
    throw new Error("Generated source files are required");
  }

  let resolvedOwner = String(owner || "").trim();
  if (!resolvedOwner) {
    resolvedOwner = await getAuthenticatedLogin(token);
  }

  const normalizedBranch = String(branch || "main").trim() || "main";
  const normalizedPrefix = normalizeRepoPath(pathPrefix);
  const repoInfo = await ensureRepository({
    token,
    owner: resolvedOwner,
    repoName: String(repoName).trim(),
    createRepo,
    privateRepo
  });

  const uploadedFiles = [];
  const entries = Object.entries(filesMap);

  for (const [relativePath, content] of entries) {
    const fullPath = normalizeRepoPath([normalizedPrefix, relativePath].filter(Boolean).join("/"));
    const sha = await getFileSha({
      token,
      owner: resolvedOwner,
      repoName: String(repoName).trim(),
      branch: normalizedBranch,
      path: fullPath
    });

    const result = await putFile({
      token,
      owner: resolvedOwner,
      repoName: String(repoName).trim(),
      branch: normalizedBranch,
      path: fullPath,
      content,
      sha,
      message:
        commitMessage ||
        `Add generated portfolio source${traceId ? ` (${traceId.slice(0, 8)})` : ""}`
    });

    uploadedFiles.push({
      path: fullPath,
      commitSha: result?.commit?.sha || null
    });
  }

  return {
    repoUrl: repoInfo.htmlUrl || `https://github.com/${resolvedOwner}/${repoName}`,
    owner: resolvedOwner,
    repoName: String(repoName).trim(),
    branch: normalizedBranch,
    pathPrefix: normalizedPrefix,
    createdRepo: !repoInfo.exists,
    filesUpdated: uploadedFiles.length,
    uploadedFiles
  };
};
