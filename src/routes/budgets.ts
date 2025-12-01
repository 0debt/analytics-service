import { Hono } from 'hono';
import * as budgetController from '@/controllers/budgetController';

/**
 * Loads budget routes onto the Hono app.
 * @param app - Hono application instance
 */
function loadBudgetsV1(app: Hono) {
    // Health check
    app.get('/v1/health', (c) => {
        return c.json({
            message: 'ANALYTICS SERVICE',
            version: '1',
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
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
