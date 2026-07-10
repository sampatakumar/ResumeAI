import { beforeEach, describe, expect, it, vi } from "vitest";

const readFileMock = vi.fn();
const downloadResumeFromSupabaseStorageMock = vi.fn();
const resolveSupabaseResumeStorageLocationMock = vi.fn((resume) => ({
  bucketName: "resumes-test",
  storagePath: resume.supabaseStoragePath || ""
}));

vi.mock("fs/promises", () => ({
  default: {
    readFile: readFileMock
  },
  readFile: readFileMock
}));

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn()
  }
}));

vi.mock("tesseract.js", () => ({
  createWorker: vi.fn()
}));

vi.mock("../src/utils/supabase-storage.js", () => ({
  downloadResumeFromSupabaseStorage: downloadResumeFromSupabaseStorageMock,
  resolveSupabaseResumeStorageLocation: resolveSupabaseResumeStorageLocationMock
}));

describe("extractResumeRawText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    downloadResumeFromSupabaseStorageMock.mockResolvedValue({
      buffer: Buffer.from("supabase pdf")
    });
    readFileMock.mockImplementation(async (filePath, encoding) => {
      if (encoding === "utf8") {
        return `local text for ${filePath}`;
      }

      return Buffer.from(`local text for ${filePath}`);
    });
  });

  it("does not fall back to a local upload when a Supabase Storage file cannot be read", async () => {
    downloadResumeFromSupabaseStorageMock.mockRejectedValueOnce(new Error("missing object"));

    const { extractResumeRawText } = await import("../src/services/resume-extraction.service.js");

    const text = await extractResumeRawText({
      content: "Uploaded resume",
      supabaseStoragePath: "user_123/candidate.pdf",
      storedFileName: "candidate.txt"
    });

    expect(text).toBe("");
    expect(downloadResumeFromSupabaseStorageMock).toHaveBeenCalledTimes(1);
    expect(readFileMock).not.toHaveBeenCalled();
  });
});
