import { adminTexts } from "@/lib/texts";

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("et-EE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Tallinn",
  });
}

// JSON fetch for the owner API. A 401 means the owner session expired, so the page reloads to the login form.
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (response.status === 401) {
    window.location.reload();
    throw new Error("Unauthorized");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : adminTexts.error);
  return data as T;
}
