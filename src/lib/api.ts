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

export function setSession(token: string, agencyId?: string) {
  localStorage.setItem("biqs_token", token);
  if (agencyId) localStorage.setItem("biqs_agency_id", agencyId);
}

export function clearSession() {
  localStorage.removeItem("biqs_token");
  localStorage.removeItem("biqs_agency_id");
}

/** Empty API_URL = same-origin (Next.js rewrites proxy to backend). */
function apiBase() {
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

  const res = await fetch(`${apiBase()}${path}`, { ...options, headers });
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

export function pdfUrl(reportId: string) {
  const token = getToken();
  return `${apiBase()}/api/reports/${reportId}/pdf?token=${token || ""}`;
}

export async function downloadReportPdf(reportId: string, filename: string) {
  const token = getToken();
  const agencyId = getAgencyId();
  const res = await fetch(`${apiBase()}/api/reports/${reportId}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(agencyId ? { "X-Agency-Id": agencyId } : {}),
    },
  });
  if (!res.ok) throw new Error("Failed to download PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
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
