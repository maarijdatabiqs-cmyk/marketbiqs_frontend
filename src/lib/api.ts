const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://marketbiqsbackend-production.up.railway.app"
).replace(/\/$/, "");

export type ApiError = { detail?: string | { msg: string }[] };

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("biqs_token");
}

function getAgencyId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("biqs_agency_id");
}

export function setSession(token: string, agencyId?: string | null) {
  localStorage.setItem("biqs_token", token);
  if (agencyId) {
    localStorage.setItem("biqs_agency_id", agencyId);
  } else {
    localStorage.removeItem("biqs_agency_id");
  }
}

export function clearSession() {
  localStorage.removeItem("biqs_token");
  localStorage.removeItem("biqs_agency_id");
}

/**
 * Browser: same-origin `/api/...` so Next.js rewrites proxy to the backend (avoids CORS).
 * Server: absolute backend URL.
 *
 * Long AI jobs must not rely on a single proxied request — use runClientIntel() which
 * starts a background job and polls (Next/Railway proxies often time out around 30–60s).
 */
function apiBase() {
  if (typeof window !== "undefined") return "";
  return API_URL;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const agencyId = getAgencyId();
  if (agencyId) headers.set("X-Agency-Id", agencyId);

  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { ...options, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
      throw new Error(
        "Could not reach the API (timeout or network). Try again — long AI/Jira jobs sometimes hit the host limit.",
      );
    }
    throw err instanceof Error ? err : new Error(msg);
  }
  if (!res.ok) {
    let detail = "Request failed";
    try {
      const data = (await res.json()) as ApiError;
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail)) detail = data.detail.map((d) => d.msg).join(", ");
    } catch {
      detail = res.statusText;
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return undefined as T;
}

export type IntelJob = {
  id: string;
  status: string;
  detail?: string | null;
  result_meta?: {
    enrich?: { features?: number };
    pack?: { competitors?: number };
    report_id?: string;
    [key: string]: unknown;
  } | null;
};

/** Start client intel in the background and poll until completed/failed. */
export async function runClientIntel(
  clientId: string,
  options: {
    competitor_scope: "global" | "local";
    competitor_country?: string;
    competitor_count: number;
  },
): Promise<IntelJob> {
  const started = await api<{ job_id: string; status: string }>(`/api/clients/${clientId}/auto-run`, {
    method: "POST",
    body: JSON.stringify({
      competitor_scope: options.competitor_scope,
      competitor_country: options.competitor_country || null,
      competitor_count: options.competitor_count,
    }),
  });
  if (!started?.job_id) {
    throw new Error("Intel did not return a job id");
  }
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const job = await api<IntelJob>(`/api/clients/${clientId}/jobs/${started.job_id}`);
    if (job.status === "completed") return job;
    if (job.status === "failed") {
      throw new Error(job.detail || "Intel run failed");
    }
  }
  throw new Error("Intel is still running after 5 minutes. Refresh and check Radar → jobs.");
}

export function pdfUrl(reportId: string) {
  const token = getToken();
  return `${apiBase()}/api/reports/${reportId}/pdf?token=${token || ""}`;
}

export async function downloadReportPdf(reportId: string, filename: string) {
  const token = getToken();
  const agencyId = getAgencyId();
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/reports/${reportId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(agencyId ? { "X-Agency-Id": agencyId } : {}),
      },
    });
  } catch {
    throw new Error("Could not download PDF (network/CORS). Try again after refresh.");
  }
  if (!res.ok) {
    let detail = "Failed to download PDF";
    try {
      const data = (await res.json()) as ApiError;
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      if (res.status === 401) detail = "Session expired — sign in again to download PDFs.";
      else if (res.status === 404) detail = "PDF not found for this report.";
    }
    throw new Error(detail);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  created_at?: string;
  pending?: boolean;
};

type StreamHandlers = {
  onUser?: (message: ChatMessage) => void;
  onDelta?: (content: string) => void;
  onDone?: (message: ChatMessage) => void;
  onError?: (detail: string) => void;
  signal?: AbortSignal;
};

/** Stream assistant reply via SSE (`/chat/stream`). */
export async function streamChat(
  clientId: string,
  message: string,
  handlers: StreamHandlers = {},
): Promise<void> {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const agencyId = getAgencyId();
  if (agencyId) headers.set("X-Agency-Id", agencyId);

  const res = await fetch(`${apiBase()}/api/clients/${clientId}/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message }),
    signal: handlers.signal,
  });

  if (!res.ok) {
    let detail = "Chat failed";
    try {
      const data = (await res.json()) as ApiError;
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail)) detail = data.detail.map((d) => d.msg).join(", ");
    } catch {
      detail = res.statusText || detail;
    }
    throw new Error(detail);
  }

  if (!res.body) throw new Error("No stream from server");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const raw = line.replace(/^data:\s?/, "");
      if (!raw || raw === "[DONE]") continue;
      let event: { type?: string; message?: ChatMessage; content?: string; detail?: string };
      try {
        event = JSON.parse(raw);
      } catch {
        continue;
      }
      if (event.type === "user" && event.message) handlers.onUser?.(event.message);
      else if (event.type === "delta" && event.content) handlers.onDelta?.(event.content);
      else if (event.type === "done" && event.message) handlers.onDone?.(event.message);
      else if (event.type === "error") {
        handlers.onError?.(event.detail || "Stream error");
        throw new Error(event.detail || "Stream error");
      }
    }
  }
}
