/**
 * Required structures introduced by checkout snapshot and authentication
 * hardening migrations. Basic connectivity cannot detect stale schema.
 */
export type RequiredSchemaState = {
  orderItemSnapshotReady: boolean;
  loginThrottleReady: boolean;
};

export function hasRequiredSchema(state: RequiredSchemaState | null | undefined): boolean {
  return state?.orderItemSnapshotReady === true && state.loginThrottleReady === true;
}
