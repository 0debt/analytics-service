import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import * as budgetController from '@/controllers/budgetController';
import { getUserContext } from '@/helpers/userContext';

/**
 * Loads budget routes onto the Hono app.
 * @param app - Hono application instance
 */
function loadBudgetsV1(app: Hono) {
    const monthlyMs = 1000 * 60 * 60 * 24 * 30;
    // Pre-built limiters by plan to keep logic simple
    const chartLimiterFree = rateLimiter({
        windowMs: monthlyMs,
        limit: 2,
        standardHeaders: 'draft-6',
        keyGenerator: (c) => {
            const user = getUserContext(c);
            return user?.userId || c.req.header('x-forwarded-for') || 'unknown';
        },
        message: 'Rate limit exceeded for chart endpoint (FREE plan: 2/month)'
    });
    const chartLimiterPro = rateLimiter({
        windowMs: monthlyMs,
        limit: 15,
        standardHeaders: 'draft-6',
        keyGenerator: (c) => {
            const user = getUserContext(c);
            return user?.userId || c.req.header('x-forwarded-for') || 'unknown';
        },
        message: 'Rate limit exceeded for chart endpoint (PRO plan: 15/month)'
    });
    const chartLimiterEnterprise = rateLimiter({
        windowMs: monthlyMs,
        limit: 50,
        standardHeaders: 'draft-6',
        keyGenerator: (c) => {
            const user = getUserContext(c);
            return user?.userId || c.req.header('x-forwarded-for') || 'unknown';
        },
        message: 'Rate limit exceeded for chart endpoint (ENTERPRISE plan: 50/month)'
    });

    // Health check
    app.get('/v1/health', (c) => {
        return c.json({
            message: 'ANALYTICS SERVICE',
            version: '1',
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    });

    // Rate limit QuickChart endpoint by plan (fallback to FREE when no token)
    app.use('/v1/budgets/:id/chart', async (c, next) => {
        const plan = getUserContext(c)?.plan?.toUpperCase() || 'FREE';
        if (plan === 'ENTERPRISE') {
            return chartLimiterEnterprise(c, next);
        }
        if (plan === 'PRO') {
            return chartLimiterPro(c, next);
        }
        return chartLimiterFree(c, next);
    });

    // Budget CRUD
    app.post('/v1/budgets', budgetController.createBudget);
    app.get('/v1/budgets/group/:groupId', budgetController.listGroupBudgets);
    app.put('/v1/budgets/:id', budgetController.updateBudget);
    app.delete('/v1/budgets/:id', budgetController.deleteBudget);

    // Budget status & charts
    app.get('/v1/budgets/:id/status', budgetController.getBudgetStatus);
    app.get('/v1/budgets/:id/chart', budgetController.getBudgetChart);

    // Internal SAGA endpoint
    app.delete('/v1/internal/users/:userId', budgetController.deleteUserBudgets);
}

export default loadBudgetsV1;
