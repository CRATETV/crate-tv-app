// What the Amazon (AWS) bill looks like, in plain numbers, for the admin Overview.
//
// AWS Cost Explorer returns one row per (service, kind-of-charge) per month.
// "Credit" rows are the Amazon credits being applied (negative numbers). We
// keep them apart from the real charges, so the card can show BOTH:
//   • what AWS would charge with no credits  (the number to watch for when the credits run out)
//   • what is actually being charged right now
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';

export interface AwsMonth { month: string; charges: number; credits: number; owed: number }
export interface AwsService { name: string; amount: number }
export interface AwsCostSummary {
    thisMonth: AwsMonth;
    lastMonth: AwsMonth | null;
    /** Whole-month guess from the days so far (null in the first days of a month). */
    estimateCharges: number | null;
    storage: number;              // S3 charges this month, before credits
    storageLastMonth: number | null;
    services: AwsService[];       // this month, before credits, biggest first
    asOf: string;                 // ISO time this was read from AWS
}

const S3 = 'Amazon Simple Storage Service';
const CREDITLIKE = new Set(['Credit', 'Refund']);
const round = (n: number) => Math.round(n * 100) / 100;

type CeResult = { TimePeriod?: { Start?: string }; Groups?: { Keys?: string[]; Metrics?: { UnblendedCost?: { Amount?: string } } }[] };

function foldMonth(r: CeResult) {
    let charges = 0, credits = 0, storage = 0;
    const byService = new Map<string, number>();
    for (const g of r.Groups || []) {
        const [service = 'Other', kind = 'Usage'] = g.Keys || [];
        const amt = Number(g.Metrics?.UnblendedCost?.Amount ?? 0) || 0;
        if (CREDITLIKE.has(kind)) { credits += amt; continue; }
        charges += amt;
        byService.set(service, (byService.get(service) || 0) + amt);
        if (service === S3) storage += amt;
    }
    const start = r.TimePeriod?.Start || '';
    const month: AwsMonth = { month: start.slice(0, 7), charges: round(charges), credits: round(-credits), owed: round(Math.max(0, charges + credits)) };
    const services = [...byService.entries()].map(([name, amount]) => ({ name, amount: round(amount) }))
        .filter(s => Math.abs(s.amount) >= 0.01).sort((a, b) => b.amount - a.amount);
    return { month, services, storage: round(storage) };
}

/** Turns the raw Cost Explorer answer into the small summary the card shows. `now` is the current time. */
export function summarizeAwsCost(results: CeResult[], now: Date): AwsCostSummary | null {
    if (!results.length) return null;
    const sorted = [...results].sort((a, b) => (a.TimePeriod?.Start || '').localeCompare(b.TimePeriod?.Start || ''));
    const curMonthKey = now.toISOString().slice(0, 7);
    const cur = sorted.find(r => (r.TimePeriod?.Start || '').startsWith(curMonthKey)) || sorted[sorted.length - 1];
    const prev = sorted.find(r => r !== cur);
    const c = foldMonth(cur);
    const p = prev ? foldMonth(prev) : null;
    // AWS runs about a day behind, so only count the days that are done.
    const day = now.getUTCDate();
    const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    const done = day - 1;
    const estimateCharges = done >= 3 ? round(c.month.charges / done * daysInMonth) : null;
    return {
        thisMonth: c.month, lastMonth: p ? p.month : null, estimateCharges,
        storage: c.storage, storageLastMonth: p ? p.storage : null,
        services: c.services, asOf: now.toISOString(),
    };
}

/** Plain words for the errors people actually hit setting this up. */
export function friendlyAwsError(e: unknown): string {
    const name = (e as any)?.name || '';
    const msg = String((e as any)?.message || e || '');
    if (/AccessDenied|not authorized|UnauthorizedOperation/i.test(name + msg))
        return 'AWS says this key is not allowed to see billing yet. In AWS: (1) give the key the permission "ce:GetCostAndUsage", and (2) in Billing → Account, turn on "IAM user and role access to Billing information" if the key belongs to an IAM user.';
    if (/DataUnavailable|not enabled|OptIn|has not been enabled/i.test(name + msg))
        return 'AWS Cost Explorer is not turned on yet. In AWS → Billing → Cost Explorer, click "Launch Cost Explorer". The numbers show up about a day later.';
    if (/credential|InvalidClientTokenId|SignatureDoesNotMatch/i.test(name + msg))
        return 'The AWS key on the server was not accepted.';
    return 'Could not read the AWS bill right now.';
}

export async function fetchAwsCost(client: Pick<CostExplorerClient, 'send'>, now: Date = new Date()): Promise<AwsCostSummary | null> {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const out = await client.send(new GetCostAndUsageCommand({
        TimePeriod: { Start: ymd(first), End: ymd(tomorrow) },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
        GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }, { Type: 'DIMENSION', Key: 'RECORD_TYPE' }],
    }));
    return summarizeAwsCost((out.ResultsByTime || []) as CeResult[], now);
}

export function billingClient(): CostExplorerClient | null {
    const accessKeyId = process.env.AWS_BILLING_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_BILLING_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) return null;
    // Cost Explorer only lives in us-east-1, whatever region the bucket is in.
    return new CostExplorerClient({ region: 'us-east-1', credentials: { accessKeyId, secretAccessKey } });
}
