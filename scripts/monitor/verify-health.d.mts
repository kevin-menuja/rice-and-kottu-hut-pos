export interface ReadinessResult {
  ok: boolean;
  reason: string;
}
export function assessReadiness(httpStatus: number, payload: unknown): ReadinessResult;
export function checkHealth(
  url: string | URL,
  fetchImpl?: typeof fetch,
): Promise<ReadinessResult>;
