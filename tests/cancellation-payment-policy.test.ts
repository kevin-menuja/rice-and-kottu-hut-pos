import assert from "node:assert/strict";
import test from "node:test";

import { hasPaidTender } from "../src/features/orders/utils/cancellation-payment-policy";

test("paid tender requires explicit no-refund acknowledgement", () => {
  assert.equal(hasPaidTender([{ paymentStatus: "PAID" }]), true);
  assert.equal(hasPaidTender([{ paymentStatus: "PAID" }, { paymentStatus: "REFUNDED" }]), true);
});

test("unpaid and refunded tenders do not count as outstanding paid payments", () => {
  assert.equal(hasPaidTender([]), false);
  assert.equal(hasPaidTender([{ paymentStatus: "PENDING" }]), false);
  assert.equal(hasPaidTender([{ paymentStatus: "REFUNDED" }]), false);
});

import { cancellationSchema } from "../src/features/orders/validations/order";

test("server input defaults refund acknowledgement to false; only explicit true passes", () => {
  const input = { orderId: "00000000-0000-4000-8000-000000000001", reason: "Test cancellation" };
  assert.equal(cancellationSchema.parse(input).acknowledgeNoAutomaticRefund, false);
  assert.equal(cancellationSchema.parse({ ...input, acknowledgeNoAutomaticRefund: true }).acknowledgeNoAutomaticRefund, true);
  assert.equal(cancellationSchema.safeParse({ ...input, acknowledgeNoAutomaticRefund: "true" }).success, false);
});
