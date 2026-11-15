import { pathToFileURL } from "node:url";

export function assessReadiness(httpStatus, payload) {
  if (httpStatus !== 200) return { ok: false, reason: "HTTP_NOT_200" };
  if (!payload || typeof payload !== "object") return { ok: false, reason: "INVALID_JSON" };
  if (payload.status !== "ok" || payload.database !== "connected") {
    return { ok: false, reason: "READINESS_UNHEALTHY" };
  }
  return { ok: true, reason: "OK" };
}

export async function checkHealth(url, fetchImpl = globalThis.fetch) {
  const link = new URL(url);
  if (link.protocol !== "https:" || link.hostname !== "startek-restaurant-pos.netlify.app" ||
      link.pathname !== "/api/health") {
    throw new Error("Refusing to monitor a URL outside the configured production health endpoint.");
  }
  let response;
  try {
    response = await fetchImpl(link, {
      signal: AbortSignal.timeout(18_000),
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
  } catch {
    return { ok: false, reason: "NETWORK_UNAVAILABLE" };
  }
  let payload;
  try { payload = await response.json(); }
  catch { return { ok: false, reason: "INVALID_JSON" }; }
  return assessReadiness(response.status, payload);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkHealth("https://startek-restaurant-pos.netlify.app/api/health")
    .then(result => {
      console.log(JSON.stringify({ check: "production-pos-readiness", ...result, at: new Date().toISOString() }));
      if (!result.ok) process.exitCode = 1;
    })
    .catch(() => {
      console.error("production readiness check failed");
      process.exitCode = 1;
    });
}
