/**
 * Cancelling an order changes its fulfillment status, not the tender ledger.
 * POS has no integrated refund operation. Never imply that a PAID payment was
 * refunded just because the order was cancelled.
 */
export function hasPaidTender(
  payments: readonly { paymentStatus: "PENDING" | "PAID" | "REFUNDED" }[],
): boolean {
  return payments.some((payment) => payment.paymentStatus === "PAID");
}
