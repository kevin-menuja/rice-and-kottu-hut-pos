import { randomUUID } from "node:crypto";

export function newRequestId(): string {
  return randomUUID();
}

/**
 * Emit only predetermined fields: never print request URLs, credentials,
 * exception messages, session tokens, or personal/customer records.
 */
export function healthFailureEvent(
  requestId: string,
  durationMs: number,
  at = new Date(),
  event: "database_health_failed" | "database_schema_incompatible" = "database_health_failed",
): string {
  return JSON.stringify({
    at: at.toISOString(),
    service: "startek-restaurant-pos",
    event,
    severity: "error",
    requestId,
    durationMs: Math.max(0, Math.round(durationMs)),
  });
}
