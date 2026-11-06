import assert from "node:assert/strict";
import { meterCustomer } from "./usage_meter.ts";

const result = meterCustomer({
  customerId: "harbor-foundation",
  events: [
    { customerId: "harbor-foundation", kind: "donor_receipt", quantity: 4, occurredAt: "2026-01-01T00:00:00.000Z" },
    { customerId: "harbor-foundation", kind: "campaign_report", quantity: 2, occurredAt: "2026-01-01T00:00:00.000Z" },
    { customerId: "other-foundation", kind: "volunteer_reminder", quantity: 9, occurredAt: "2026-01-01T00:00:00.000Z" }
  ]
});

assert.deepEqual(result, {
  customerId: "harbor-foundation",
  totalUnits: 6,
  byKind: { donor_receipt: 4, volunteer_reminder: 0, campaign_report: 2 }
});
console.log("meterCustomer keeps usage isolated per customer");
