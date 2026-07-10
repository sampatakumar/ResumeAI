import { firebaseAuth } from "./firebase";

const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";

export const getApiBaseUrl = () => (import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

export const getBackendOrigin = () => getApiBaseUrl().replace(/\/api\/v1$/i, "");
export const ensureExternalHttpsUrl = (value: string) => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue.replace(/^\/+/, "")}`;
};

const isBrowserDeployedAgainstLocalhostApi = () =>
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  /^https?:\/\/localhost(?::\d+)?\/?/i.test(getApiBaseUrl());

export type ApiEnvelope<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
};

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
  } = {}
): Promise<ApiEnvelope<T>> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  try {
    if (isBrowserDeployedAgainstLocalhostApi()) {
      throw new Error(
        `Frontend is still pointing to ${getApiBaseUrl()}. Set VITE_API_URL to your deployed backend URL before building the frontend.`
      );
    }

    const token = options.token !== undefined
      ? options.token
      : (await firebaseAuth.currentUser?.getIdToken() || null);

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" })
      },
      cache: "no-store",
      body: options.body
        ? isFormData
          ? options.body
          : JSON.stringify(options.body)
        : undefined
    });

    const payload = (await response.json()) as ApiEnvelope<T> | { message?: string; error?: string };

    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Request failed");
    }

    return payload as ApiEnvelope<T>;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Failed to reach backend at ${getApiBaseUrl()}. Make sure the backend is running and VITE_API_URL is set correctly.`);
    }

    throw error;
  }
}
