import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyFirebaseToken = vi.fn();
const exportPortfolioToGitHub = vi.fn();
const publishPortfolio = vi.fn();
const incrementDailyCounter = vi.fn();

vi.mock("../src/middlewares/auth.middleware.js", () => ({
  verifyFirebaseToken
}));

vi.mock("../src/contollers/portfolio.controller.js", () => ({
  exportPortfolioToGitHub
}));

vi.mock("../src/services/portfolioService.js", () => ({
  publishPortfolio
}));

vi.mock("../src/models/analytics.models.js", () => ({
  incrementDailyCounter
}));

describe("Portfolio publish queue integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    verifyFirebaseToken.mockImplementation((req, _res, next) => {
      const uid = String(req.headers["x-test-uid"] || "user-1");
      req.auth = {
        uid
      };
      req.user = {
        id: uid
      };
      next();
    });
  });

  it("returns a queued job immediately and hides it from other users", async () => {
    let resolvePublish;

    publishPortfolio.mockReturnValue(
      new Promise((resolve) => {
        resolvePublish = resolve;
      })
    );

    const { default: portfolioRouter } = await import("../src/routes/portfolio.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/portfolio", portfolioRouter);

    const publishResponse = await request(app)
      .post("/portfolio/publish")
      .set("x-test-uid", "user-1")
      .send({
        preference: { theme: "minimal" },
        customDomain: "pankaj.dev"
      });

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.success).toBe(true);
    expect(publishResponse.body.jobId).toBeTruthy();

    const jobId = publishResponse.body.jobId;

    const pendingStatus = await request(app)
      .get(`/portfolio/status/${jobId}`)
      .set("x-test-uid", "user-1");

    expect(pendingStatus.status).toBe(200);
    expect(pendingStatus.body.status).toBe("processing");

    const foreignStatus = await request(app)
      .get(`/portfolio/status/${jobId}`)
      .set("x-test-uid", "user-2");

    expect(foreignStatus.status).toBe(404);

    resolvePublish({
      url: "https://portfolio.pages.dev",
      domainInfo: {
        domain: "pankaj.dev"
      }
    });

    await vi.waitFor(async () => {
      const completedStatus = await request(app)
        .get(`/portfolio/status/${jobId}`)
        .set("x-test-uid", "user-1");

      expect(completedStatus.status).toBe(200);
      expect(completedStatus.body.status).toBe("completed");
      expect(completedStatus.body.url).toBe("https://portfolio.pages.dev");
      expect(completedStatus.body.customDomain).toBe("pankaj.dev");
    });

    expect(incrementDailyCounter).toHaveBeenCalledWith("portfoliosPublished", 1);
  });
});
