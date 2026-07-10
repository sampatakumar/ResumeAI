import { mkdtemp, mkdir, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import pLimit from "p-limit";

const buildLimit = pLimit(1);

const getNpmCommand = () => (process.platform === "win32" ? "npm.cmd" : "npm");

const runCommand = ({ command, args, cwd, traceId }) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(`Command failed (${command} ${args.join(" ")}) with exit code ${code}`);
      error.traceId = traceId;
      error.stdout = stdout;
      error.stderr = stderr;
      error.exitCode = code;
      reject(error);
    });
  });

const writeProjectFiles = async (workspaceDir, filesMap) => {
  const entries = Object.entries(filesMap || {});

  for (const [relativePath, content] of entries) {
    const absolutePath = path.join(workspaceDir, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, String(content || ""), "utf8");
  }
};

const readDistFiles = async (distDir, baseDir = distDir) => {
  const entries = await readdir(distDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(distDir, entry.name);

    if (entry.isDirectory()) {
      const nested = await readDistFiles(absolutePath, baseDir);
      files.push(...nested);
      continue;
    }

    const relativePath = path.relative(baseDir, absolutePath).replace(/\\/g, "/");
    const content = await readFile(absolutePath);

    files.push({
      path: `/${relativePath}`,
      content
    });
  }

  return files;
};

export const buildViteProjectToDist = async ({ filesMap, traceId = "" }) => {
  return buildLimit(async () => {
    const tempBaseDir = await realpath(os.tmpdir());
    const workspaceDir = await mkdtemp(path.join(tempBaseDir, "bmr-portfolio-"));
    const npmCommand = getNpmCommand();

    try {
      console.info("[portfolio-build:start]", {
        traceId,
        workspaceDir,
        fileCount: Object.keys(filesMap || {}).length
      });

      await writeProjectFiles(workspaceDir, filesMap);

      await runCommand({
        command: npmCommand,
        args: ["install", "--no-audit", "--no-fund", "--silent"],
        cwd: workspaceDir,
        traceId
      });

      await runCommand({
        command: npmCommand,
        args: ["run", "build"],
        cwd: workspaceDir,
        traceId
      });

      const distDir = path.join(workspaceDir, "dist");
      const distFiles = await readDistFiles(distDir);

      if (!distFiles.length) {
        throw new Error("Vite build produced empty dist output");
      }

      console.info("[portfolio-build:success]", {
        traceId,
        distFileCount: distFiles.length
      });

      return {
        distFiles
      };
    } finally {
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });
};
