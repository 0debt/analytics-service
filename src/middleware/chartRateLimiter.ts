import type { Context, Next } from 'hono';
import { getUserContext } from '@/helpers/userContext';

const monthlyMs = 1000 * 60 * 60 * 24 * 30; // ~30 days
const planLimits = {
    FREE: 2,
    PRO: 15,
    ENTERPRISE: 50,
} as const;

const chartCounters = new Map<string, { count: number; resetAt: number }>();

function getQuotaKey(c: Context) {
    return getUserContext(c)?.userId
        || c.req.header('x-forwarded-for')
        || c.req.header('x-real-ip')
        || c.req.header('cf-connecting-ip')
        || c.req.header('x-client-ip')
        || c.req.header('x-cluster-client-ip')
        || 'unknown';
}

function consumeChartQuota(plan: 'FREE' | 'PRO' | 'ENTERPRISE', key: string) {
    const now = Date.now();
    const limit = planLimits[plan] ?? planLimits.FREE;
    const current = chartCounters.get(key);

    if (!current || now >= current.resetAt) {
        const resetAt = now + monthlyMs;
        chartCounters.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: limit - 1, resetAt };
    }

    if (current.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: current.resetAt };
    }

    current.count += 1;
    return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt };
}

export async function chartRateLimiter(c: Context, next: Next) {
    const plan = (getUserContext(c)?.plan?.toUpperCase() || 'FREE') as 'FREE' | 'PRO' | 'ENTERPRISE';
    const key = getQuotaKey(c);
    const result = consumeChartQuota(plan, key);

    if (!result.allowed) {
        return c.json({
            error: 'Rate limit exceeded for chart endpoint',
            plan,
            limit: planLimits[plan],
            resetAt: result.resetAt
        }, 429);
    }

    return next();
}