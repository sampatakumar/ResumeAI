import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("Root and Healthcheck routes", () => {
  it("returns 200 OK and status message for GET /", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("ResumeAI API Backend is running");
  });

  it("returns 200 OK for GET /api/v1/healthcheck", async () => {
    const response = await request(app).get("/api/v1/healthcheck");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });

  it("returns 200 OK for GET /api/v1/healthcheck/health", async () => {
    const response = await request(app).get("/api/v1/healthcheck/health");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });
});
