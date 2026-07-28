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
