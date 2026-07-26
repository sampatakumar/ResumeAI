import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpload = vi.fn();
const mockDownload = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockRemove = vi.fn();

const mockFrom = vi.fn(() => ({
  upload: mockUpload,
  download: mockDownload,
  createSignedUrl: mockCreateSignedUrl,
  remove: mockRemove
}));

const mockClient = {
  storage: {
    from: mockFrom
  }
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockClient)
}));

describe("supabase resume storage helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ data: {}, error: null });
    mockDownload.mockResolvedValue({
      data: {
        arrayBuffer: async () => new ArrayBuffer(9),
        type: "application/pdf",
        size: 9
      },
      error: null
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.supabase.co/signed/resume.pdf" },
      error: null
    });
    mockRemove.mockResolvedValue({ data: {}, error: null });
  });

  it("uploads resume buffers into Supabase Storage under the configured folder", async () => {
    const { uploadResumeToSupabaseStorage } = await import("../src/utils/supabase-storage.js");

    const result = await uploadResumeToSupabaseStorage({
      buffer: Buffer.from("resume pdf"),
      originalFileName: "Sampatakumar Resume.pdf",
      mimeType: "application/pdf",
      ownerKey: "user_123"
    });

    expect(mockFrom).toHaveBeenCalledWith("resumes-test");
    expect(mockUpload).toHaveBeenCalledTimes(1);

    const callArgs = mockUpload.mock.calls[0];
    const storagePath = callArgs[0];
    const bufferArg = callArgs[1];
    const optionsArg = callArgs[2];

    expect(storagePath).toMatch(/^user_123\/\d+-[0-9a-f-]+-Sampatakumar_Resume\.pdf$/i);
    expect(bufferArg).toEqual(Buffer.from("resume pdf"));
    expect(optionsArg).toEqual(
      expect.objectContaining({
        contentType: "application/pdf",
        cacheControl: "private, max-age=0, no-transform",
        upsert: true
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        bucketName: "resumes-test",
        storagePath,
        fileName: expect.stringMatching(/Sampatakumar_Resume\.pdf$/),
        filePath: `supabase://resumes-test/${storagePath}`
      })
    );
  });

  it("downloads resume bytes and metadata from Supabase Storage", async () => {
    const { downloadResumeFromSupabaseStorage } = await import("../src/utils/supabase-storage.js");

    const result = await downloadResumeFromSupabaseStorage({
      bucketName: "resumes-test",
      storagePath: "user_123/resume.pdf"
    });

    expect(mockFrom).toHaveBeenCalledWith("resumes-test");
    expect(mockDownload).toHaveBeenCalledWith("user_123/resume.pdf");
    expect(result).toEqual(
      expect.objectContaining({
        buffer: expect.any(Buffer),
        contentType: "application/pdf",
        contentLength: "9"
      })
    );
  });

  it("builds direct Supabase signed read urls for resumes", async () => {
    const { getSupabaseResumeSignedReadUrl } = await import("../src/utils/supabase-storage.js");

    const result = await getSupabaseResumeSignedReadUrl({
      bucketName: "resumes-test",
      storagePath: "user_123/resume.pdf"
    });

    expect(mockFrom).toHaveBeenCalledWith("resumes-test");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user_123/resume.pdf", 3600);
    expect(result).toEqual(
      expect.objectContaining({
        url: "https://example.supabase.co/signed/resume.pdf",
        expiresAt: expect.any(Number)
      })
    );
  });

  it("resolves Supabase storage location from explicit fields and supabase urls", async () => {
    const { resolveSupabaseResumeStorageLocation } = await import("../src/utils/supabase-storage.js");

    expect(
      resolveSupabaseResumeStorageLocation({
        supabaseStorageBucket: "resumes-test",
        supabaseStoragePath: "user_123/resume.pdf"
      })
    ).toEqual({
      bucketName: "resumes-test",
      storagePath: "user_123/resume.pdf"
    });

    expect(
      resolveSupabaseResumeStorageLocation({
        filePath: "supabase://resumes-test/user_123/resume.pdf"
      })
    ).toEqual({
      bucketName: "resumes-test",
      storagePath: "user_123/resume.pdf"
    });
  });

  it("deletes file from Supabase Storage during cleanup", async () => {
    const { deleteResumeFromSupabaseStorage } = await import("../src/utils/supabase-storage.js");

    await expect(
      deleteResumeFromSupabaseStorage({
        bucketName: "resumes-test",
        storagePath: "user_123/resume.pdf"
      })
    ).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith("resumes-test");
    expect(mockRemove).toHaveBeenCalledWith(["user_123/resume.pdf"]);
  });
});
