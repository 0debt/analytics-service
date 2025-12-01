import { Context } from 'hono';
import { Budget } from '@/models/budgetSchema';
import { getGroupStats, getTotalSpent } from '@/clients/expensesClient';
import { getUserContext } from '@/helpers/userContext';
import { redis } from '@/config/redis';

/**
 * Creates a new budget for a group.
 * Extracts userId from JWT token.
 * @param c - Hono context
 */
export async function createBudget(c: Context) {
    try {
        const userContext = getUserContext(c);
        if (!userContext) {
            return c.json({ error: 'Authorization required' }, 401);
        }

        let body;
        try {
            body = await c.req.json();
        } catch {
            return c.json({ error: 'Invalid JSON format' }, 400);
        }

        const { groupId, category, limitAmount, period } = body;

        if (!groupId || limitAmount === undefined || !period) {
            return c.json({ error: 'Missing required fields: groupId, limitAmount, period' }, 400);
        }

        const budget = new Budget({
            groupId,
            userId: userContext.userId,
            category,
            limitAmount,
            period,
        });

        const savedBudget = await budget.save();
        return c.json(savedBudget, 201);
    } catch (error: unknown) {
        console.error('Error creating budget:', error);
        const err = error as { name?: string; message?: string };
        if (err.name === 'ValidationError') {
            return c.json({ error: 'Validation error', details: err.message }, 400);
        }
        return c.json({ error: 'Failed to create budget' }, 500);
    }
}

/**
 * Lists all budgets for a group.
 * @param c - Hono context
 */
export async function listGroupBudgets(c: Context) {
    try {
        const groupId = c.req.param('groupId');
        const budgets = await Budget.find({ groupId });

        return c.json({
            groupId,
            budgets,
            count: budgets.length,
        }, 200);
    } catch (error) {
        console.error('Error listing group budgets:', error);
        return c.json({ error: 'Failed to list group budgets' }, 500);
    }
}

/**
 * Updates budget limit amount.
 * @param c - Hono context
 */
export async function updateBudget(c: Context) {
    try {
        const budgetId = c.req.param('id');
        const body = await c.req.json();

        const updateData: { limitAmount?: number } = {};
        if (body.limitAmount !== undefined) {
            updateData.limitAmount = body.limitAmount;
        }

        if (Object.keys(updateData).length === 0) {
            return c.json({ error: 'No valid fields to update' }, 400);
        }

        const budget = await Budget.findByIdAndUpdate(
            budgetId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!budget) {
            return c.json({ error: 'Budget not found' }, 404);
        }

        return c.json(budget, 200);
    } catch (error: unknown) {
        console.error('Error updating budget:', error);
        const err = error as { name?: string; message?: string };
        if (err.name === 'ValidationError') {
            return c.json({ error: 'Validation error', details: err.message }, 400);
        }
        return c.json({ error: 'Failed to update budget' }, 500);
    }
}

/**
 * Gets budget status with Cache-Aside pattern.
 * Caches expenses data in Redis with 60s TTL.
 * @param c - Hono context
 */
export async function getBudgetStatus(c: Context) {
    const budgetId = c.req.param('id');

    try {
        const budget = await Budget.findById(budgetId);
        if (!budget) {
            return c.json({ error: 'Budget not found' }, 404);
        }

        const cacheKey = `analytics:budget:spent:${budget.groupId}`;
        let spent: number;

        // Cache-Aside: Try cache first (graceful if Redis unavailable)
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`Cache HIT for group ${budget.groupId}`);
                spent = JSON.parse(cachedData).totalSpent;
            } else {
                console.log(`Cache MISS for group ${budget.groupId}`);
                spent = await getTotalSpent(budget.groupId);
                await redis.set(cacheKey, JSON.stringify({ totalSpent: spent }), 'EX', 60);
            }
        } catch {
            // Redis unavailable, fetch directly
            spent = await getTotalSpent(budget.groupId);
        }

        // Calculate health status
        let health: 'OK' | 'WARNING' | 'OVERBUDGET';
        if (spent > budget.limitAmount) {
            health = 'OVERBUDGET';
        } else if (spent > budget.limitAmount * 0.8) {
            health = 'WARNING';
        } else {
            health = 'OK';
        }

        return c.json({
            limit: budget.limitAmount,
            spent,
            health,
        }, 200);
    } catch (error) {
        console.error('Error getting budget status:', error);
        return c.json({ error: 'Failed to calculate status' }, 500);
    }
}

/**
 * Deletes a budget by ID.
 * @param c - Hono context
 */
export async function deleteBudget(c: Context) {
    try {
        const budgetId = c.req.param('id');
        const budget = await Budget.findByIdAndDelete(budgetId);

        if (!budget) {
            return c.json({ error: 'Budget not found' }, 404);
        }

        return c.json({ status: 'ok', message: 'Budget deleted' }, 200);
    } catch (error) {
        console.error('Error deleting budget:', error);
        return c.json({ error: 'Failed to delete budget' }, 500);
    }
}

/**
 * Gets budget chart URL (Feature Toggle).
 * Returns 503 if ENABLE_CHARTS is false.
 * @param c - Hono context
 */
export async function getBudgetChart(c: Context) {
    if (Bun.env.ENABLE_CHARTS !== 'true') {
        return c.json({ error: 'Feature Disabled' }, 503);
    }

    try {
        const budgetId = c.req.param('id');
        const budget = await Budget.findById(budgetId);

        if (!budget) {
            return c.json({ error: 'Budget not found' }, 404);
        }

        const stats = await getGroupStats(budget.groupId);
        if (!stats) {
            return c.json({ error: 'Unable to fetch stats' }, 503);
        }

        const { generateChartUrl } = await import('@/services/chartService');
        const url = generateChartUrl(stats.byCategory);

        return c.json({ url }, 200);
    } catch (error) {
        console.error('Error generating chart:', error);
        return c.json({ error: 'Failed to generate chart' }, 500);
    }
}

/**
 * SAGA: Deletes all budgets for a user.
 * Called by users-service during user deletion.
 * @param c - Hono context
 */
export async function deleteUserBudgets(c: Context) {
    try {
        const userId = c.req.param('userId');
        const result = await Budget.deleteMany({ userId });

        console.log(`SAGA User Deleted: ${userId}, budgets removed: ${result.deletedCount}`);

        return c.json({
            status: 'ok',
            deletedCount: result.deletedCount
        }, 200);
    } catch (error) {
        console.error('SAGA failed:', error);
        return c.json({ status: 'error', message: 'SAGA failed' }, 500);
    }
}
