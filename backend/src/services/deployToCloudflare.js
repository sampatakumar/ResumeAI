import axios from "axios";
import { createHash } from "node:crypto";
import { extname } from "node:path";
import FormData from "form-data";
import { env } from "../config/env.js";

const createLogger = (traceId = "") => ({
  info: (event, payload = {}) => console.info("[deployToCloudflare]", { traceId, event, ...payload }),
  error: (event, payload = {}) => console.error("[deployToCloudflare]", { traceId, event, ...payload })
});

export const getCanonicalCloudflarePagesUrl = (projectName) => `https://${projectName}.pages.dev`;

export const ensureHttpsUrl = (value) => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue.replace(/^\/+/, "")}`;
};

export const normalizeCloudflarePagesDeploymentUrl = (value, projectName = "") => {
  const normalizedUrl = ensureHttpsUrl(value);

  if (!normalizedUrl || !String(projectName || "").trim()) {
    return normalizedUrl;
  }

  const canonicalHost = `${projectName}.pages.dev`;

  try {
    const parsedUrl = new URL(normalizedUrl);

    if (
      parsedUrl.hostname === canonicalHost ||
      parsedUrl.hostname.endsWith(`.${canonicalHost}`)
    ) {
      return getCanonicalCloudflarePagesUrl(projectName);
    }
  } catch {
    return normalizedUrl;
  }

  return normalizedUrl;
};

const formatAxiosError = (error) => ({
  message: error?.message || "Unknown axios error",
  status: error?.response?.status || null,
  statusText: error?.response?.statusText || null,
  data: error?.response?.data || null
});

const getAxiosErrorMessage = (error) => {
  const apiErrors = error?.response?.data?.errors;
  if (Array.isArray(apiErrors) && apiErrors.length > 0) {
    const firstError = apiErrors[0];
    if (firstError?.message) {
      return firstError.message;
    }
  }

  return error?.message || "Unknown axios error";
};

const getContentType = (filePath) => {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".html" || extension === ".htm") {
    return "text/html";
  }

  if (extension === ".css") {
    return "text/css";
  }

  if (extension === ".js" || extension === ".mjs") {
    return "application/javascript";
  }

  if (extension === ".json") {
    return "application/json";
  }

  if (extension === ".svg") {
    return "image/svg+xml";
  }

  return "application/octet-stream";
};

const createAssetHash = (content, filePath) => {
  const bufferContent = Buffer.isBuffer(content) ? content : Buffer.from(String(content || ""), "utf8");
  const base64Content = bufferContent.toString("base64");
  const extension = extname(filePath || "").slice(1);

  return createHash("sha256")
    .update(`${base64Content}${extension}`)
    .digest("hex")
    .slice(0, 32);
};

const normalizeAssetPath = (filePath) => {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const buildAssets = (distFiles) => {
  return (distFiles || []).map((file) => {
    const filePath = normalizeAssetPath(file.path || "");
    const content = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(String(file.content || ""), "utf8");
    const hash = createAssetHash(content, filePath);

    return {
      key: hash,
      value: content.toString("base64"),
      metadata: {
        contentType: getContentType(filePath)
      },
      base64: true,
      path: filePath
    };
  });
};

const getHeaders = () => {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    throw new Error("Missing Cloudflare credentials. Set CF_ACCOUNT_ID and CF_API_TOKEN");
  }

  return {
    Authorization: `Bearer ${env.CF_API_TOKEN}`
  };
};

const getProjectEndpoint = (projectName) =>
  `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/${projectName}`;

const getUploadTokenEndpoint = (projectName) =>
  `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/${projectName}/upload-token`;

const getAssetsEndpoint = () =>
  `https://api.cloudflare.com/client/v4/pages/assets`;

const getProjectDeploymentEndpoint = (projectName) =>
  `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/${projectName}/deployments`;

const ensureProjectExists = async (projectName, logger) => {
  const headers = getHeaders();
  logger.info("project:check", { projectName });

  try {
    await axios.get(getProjectEndpoint(projectName), { headers });
    logger.info("project:exists", { projectName });
  } catch (error) {
    const status = error?.response?.status;

    if (status !== 404) {
      logger.error("project:check-failed", formatAxiosError(error));
      throw error;
    }

    logger.info("project:create", { projectName });

    await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects`,
      {
        name: projectName,
        production_branch: "main"
      },
      { headers }
    );

    logger.info("project:created", { projectName });
  }
};

const deployAssets = async (projectName, assets, options = {}) => {
  const logger = createLogger(options.traceId || "");

  logger.info("deploy:start", {
    projectName,
    assetCount: assets.length
  });

  await ensureProjectExists(projectName, logger);

  logger.info("deploy:token-request", { projectName });

  const uploadTokenResponse = await axios.get(getUploadTokenEndpoint(projectName), {
    headers: getHeaders()
  });

  const uploadJwt = uploadTokenResponse.data?.result?.jwt;

  if (!uploadJwt) {
    throw new Error("Cloudflare did not return an upload JWT");
  }

  logger.info("deploy:token-received", {
    projectName,
    tokenLength: String(uploadJwt).length
  });

  const assetHashes = assets.map((asset) => asset.key);

  logger.info("deploy:missing-check:start", {
    projectName,
    assetCount: assets.length
  });

  let missingHashes = assetHashes;

  try {
    const missingResponse = await axios.post(
      `${getAssetsEndpoint()}/check-missing`,
      {
        hashes: assetHashes
      },
      {
        headers: {
          Authorization: `Bearer ${uploadJwt}`,
          "Content-Type": "application/json"
        }
      }
    );

    missingHashes = Array.isArray(missingResponse.data?.result)
      ? missingResponse.data.result
      : assetHashes;

    logger.info("deploy:missing-check:success", {
      projectName,
      missingCount: missingHashes.length
    });
  } catch (error) {
    logger.error("deploy:missing-check:failed", formatAxiosError(error));
    throw error;
  }

  if (missingHashes.length > 0) {
    const missingAssets = assets.filter((asset) => missingHashes.includes(asset.key));

    logger.info("deploy:asset-upload:start", {
      projectName,
      uploadCount: missingAssets.length
    });

    try {
      await axios.post(
        `${getAssetsEndpoint()}/upload`,
        missingAssets.map(({ path, ...asset }) => asset),
        {
          headers: {
            Authorization: `Bearer ${uploadJwt}`,
            "Content-Type": "application/json"
          }
        }
      );

      logger.info("deploy:asset-upload:success", {
        projectName,
        uploadCount: missingAssets.length
      });
    } catch (error) {
      logger.error("deploy:asset-upload:failed", formatAxiosError(error));
      throw error;
    }
  } else {
    logger.info("deploy:asset-upload:skipped", { projectName });
  }

  const manifest = Object.fromEntries(
    assets.map(({ path, key }) => [path, key])
  );

  const form = new FormData();
  form.append("manifest", JSON.stringify(manifest));

  const headers = {
    ...getHeaders(),
    ...form.getHeaders()
  };

  try {
    const response = await axios.post(
      getProjectDeploymentEndpoint(projectName),
      form,
      { headers }
    );
    const deploymentUrl = response.data?.result?.url || null;
    const canonicalUrl = getCanonicalCloudflarePagesUrl(projectName);

    logger.info("deploy:success", {
      projectName,
      status: response.status,
      deploymentUrl,
      canonicalUrl
    });

    return canonicalUrl;
  } catch (error) {
    logger.error("deploy:failed", formatAxiosError(error));
    const wrappedError = new Error(getAxiosErrorMessage(error));
    wrappedError.statusCode = error?.response?.status || 502;
    wrappedError.details = formatAxiosError(error);
    throw wrappedError;
  }
};

export const deployPortfolio = async (projectName, htmlContent, options = {}) => {
  const assets = buildAssets([
    {
      path: "/index.html",
      content: Buffer.from(String(htmlContent || ""), "utf8")
    }
  ]);

  return deployAssets(projectName, assets, options);
};

export const deployPortfolioDist = async (projectName, distFiles, options = {}) => {
  if (!Array.isArray(distFiles) || !distFiles.length) {
    throw new Error("distFiles are required for dist deployment");
  }

  const assets = buildAssets(distFiles);
  return deployAssets(projectName, assets, options);
};

export const attachCustomDomain = async (projectName, customDomain, options = {}) => {
  const logger = createLogger(options.traceId || "");

  logger.info("domain:attach-start", {
    projectName,
    customDomain
  });

  const headers = {
    ...getHeaders(),
    "Content-Type": "application/json"
  };

  let response;
  try {
    response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/${projectName}/domains`,
      {
        name: customDomain
      },
      { headers }
    );
  } catch (error) {
    const status = error?.response?.status;
    const errText = JSON.stringify(error?.response?.data || "");
    
    // Cloudflare throws 409 Conflict if the domain is already attached
    if (status === 409 || errText.includes("already exists") || error?.message?.includes("409")) {
      logger.info("domain:attach-skipped", { projectName, customDomain, reason: "Already active" });
      return {
        domain: customDomain,
        status: "active",
        cnameTarget: `${projectName}.pages.dev`,
        instructions: `Add CNAME: ${customDomain} -> ${projectName}.pages.dev`
      };
    }
    
    logger.error("domain:attach-failed", formatAxiosError(error));
    throw error;
  }

  const domain = response.data?.result?.name || customDomain;
  const status = response.data?.result?.status || "pending";

  logger.info("domain:attach-success", {
    projectName,
    domain,
    status
  });

  return {
    domain,
    status,
    cnameTarget: `${projectName}.pages.dev`,
    instructions: `Add CNAME: ${customDomain} -> ${projectName}.pages.dev`
  };
};
