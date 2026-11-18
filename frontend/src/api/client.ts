import type { ApiErrorBody } from "./types";

export const API_BASE = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function parseError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};
  try {
    body = (await response.json()) as Partial<ApiErrorBody>;
  } catch {
    // non-JSON error body (e.g. proxy error page)
  }
  return new ApiError(
    response.status,
    body.code ?? `http_${response.status}`,
    body.detail ?? (response.statusText || "Request failed"),
  );
}

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    // Absolute URL so it also works in non-browser test environments.
    const url = new URL(`${API_BASE}${path}`, window.location.origin);
    response = await fetch(url, {
      method,
      headers: body === undefined ? { Accept: "application/json" } : {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network_error", "Cannot reach the server");
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
