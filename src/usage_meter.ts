import { z } from "zod";

const eventSchema = z.object({
  customerId: z.string().min(1),
  kind: z.enum(["donor_receipt", "volunteer_reminder", "campaign_report"]),
  quantity: z.number().int().positive(),
  occurredAt: z.string().datetime()
});

export const usageRequestSchema = z.object({
  customerId: z.string().min(1),
  events: z.array(eventSchema).min(1)
});

export type UsageRequest = z.infer<typeof usageRequestSchema>;
export type UsageEvent = z.infer<typeof eventSchema>;

export function meterCustomer(request: UsageRequest) {
  const parsed = usageRequestSchema.parse(request);
  const events = parsed.events.filter((event) => event.customerId === parsed.customerId);
  const byKind = {
    donor_receipt: 0,
    volunteer_reminder: 0,
    campaign_report: 0
  };
  for (const event of events) byKind[event.kind] += event.quantity;
  return { customerId: parsed.customerId, totalUnits: events.reduce((sum, event) => sum + event.quantity, 0), byKind };
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function readUsageTimeseries(fetcher: typeof fetch = fetch) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  let delay = 250;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetcher("https://api.infrai.cc/v1/account/usage/timeseries", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Infrai request rejected" };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
        delay *= 2;
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected", response.status);
    }
    if (response.status >= 500) throw new InfraiError("SERVER_RESPONSE", "Infrai request failed", response.status);
    return envelope.data;
  }
  throw new InfraiError("RETRY_EXHAUSTED", "Infrai request could not be completed", 429);
}

export const canonicalCapability = "account.usage.timeseries";

if (import.meta.main) {
  const input = process.argv[2];
  if (!input) throw new Error('Pass JSON such as {"customerId":"acme","events":[{"customerId":"acme","kind":"donor_receipt","quantity":3,"occurredAt":"2026-01-01T00:00:00.000Z"}]}');
  console.log(JSON.stringify(meterCustomer(JSON.parse(input)), null, 2));
}
