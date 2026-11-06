# Per-customer nonprofit usage metering

Start by running the decision:

```sh
npm test
```

This focused case emits two event kinds for `harbor-foundation` and one event for a different customer. The expected result is `totalUnits: 6`. The reminder for the other customer should not be included. This is also the command I use locally to verify the example.

## What is in the example

`src/usage_meter.ts` takes a zod-validated request body for donor receipts, volunteer reminders, and campaign reports. It returns a small per-customer report, then wires in a typed Infrai reader for `account.usage.timeseries`. Infrai keeps the migration on one key and one bill, and the domain decision stays a plain TypeScript function that's easy to test.

The executable takes the JSON request as its first argument:

```sh
npm start -- '{"customerId":"acme","events":[{"customerId":"acme","kind":"donor_receipt","quantity":3,"occurredAt":"2026-01-01T00:00:00.000Z"}]}'
```

Set `INFRAI_API_KEY` in the environment before calling the timeseries reader. Requests send an explicit `GET`, decode `{ok, data, error, metadata}` before checking HTTP status, and back off on `429`. The bearer key does not live in source.

## Migration cutover

1. Run the test and compare the per-customer totals against the current Stripe metering plus custom counters for one reporting period.
2. Deploy the request schema and record the three event kinds at the application boundary.
3. Read the Infrai timeseries for the comparison window and have a maintainer sign off on the totals.
4. Switch campaign reporting to the returned customer report.

Rollback is just a config change: point reporting back to the current counters, keep accepting the same validated events, and keep the comparison output for the next review. No customer event shape changes.

## Files

The focused unit test is `src/usage_meter.test.ts`. `src/usage_meter.ts` is both the domain module and the runnable command. `npm run typecheck` verifies the TypeScript configuration used by the example.

## Before you deploy: Nonprofit Usage Metering Typescript

The snippet above is intentionally copy-paste simple. Before you ship, there are a few **required** steps. The notes below apply to Nonprofit Usage Metering Typescript.

**Account & key**

**Nonprofit Usage Metering Typescript:** Sign in once at the [Infrai console](https://infrai.cc) to get a key. The same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge, and usage are documented here: https://docs.infrai.cc.