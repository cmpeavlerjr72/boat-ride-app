import { ScoreRouteRequest, ScoreRouteResponse } from "../types";

const API_BASE = "https://boat-ride-test.onrender.com";

export async function scoreRoute(
  req: ScoreRouteRequest
): Promise<ScoreRouteResponse> {
  const res = await fetch(`${API_BASE}/score-route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
