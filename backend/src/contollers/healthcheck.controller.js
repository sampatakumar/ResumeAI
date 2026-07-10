import { ApiResponse } from "../utils/ApiResponse.js";

export const healthcheck = (_req, res) => {
  res.status(200).json(new ApiResponse(200, { status: "ok" }, "Service is healthy"));
};
