import { apiUrl } from "../config/api";

const PENDING_KEY = "pendingNewsletterOptIn";

export function setPendingNewsletterOptIn(enabled) {
  sessionStorage.setItem(PENDING_KEY, enabled ? "1" : "0");
}

export function consumePendingNewsletterOptIn() {
  const value = sessionStorage.getItem(PENDING_KEY);
  if (value === null) return null;
  sessionStorage.removeItem(PENDING_KEY);
  return value === "1";
}

export async function applyNewsletterOptIn(getToken, enabled) {
  if (!enabled) return;
  const token = await getToken();
  if (!token) return;
  const response = await fetch(apiUrl("/api/user-settings/"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ emailNotifications: true }),
  });
  if (!response.ok) {
    throw new Error("Failed to save newsletter preference");
  }
}

export async function applyPendingNewsletterOptIn(getToken) {
  const pending = consumePendingNewsletterOptIn();
  if (pending === null) return;
  await applyNewsletterOptIn(getToken, pending);
}