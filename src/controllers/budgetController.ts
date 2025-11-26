import { Context } from 'hono';
import { expensesClient } from '../clients/ExpensesClient';

// MOCK Temporal para poder probar
const BudgetModel = {
    findById: (id: string) => ({ _id: id, groupId: 'grp-test-01', limitAmount: 200.00, category: 'Gifts' }),
};


// FUNCIÓN BASE PARA GET /budgets
export async function listAllBudgets(c: Context) {
    // Cuando esté MongoDB, BudgetModel.find({})
    return c.json({ 
        message: 'Budget Service Root OK',
        availableEndpoints: ['/group/:groupId', '/:budgetId/status'],
        status: '50% implemented (MOCK data)',
    }, 200); 
}

// Mas implementaciones de createBudget, listGroupBudgets, etc. (pueden devolver 501 Not Implemented de momento)
export async function createBudget(c: Context) { return c.json({ message: 'createBudget - 50% API OK (Not Implemented yet)' }, 501); }
export async function listGroupBudgets(c: Context) { return c.json({ message: 'listGroupBudgets - 50% API OK (Not Implemented yet)' }, 501); }
export async function updateBudget(c: Context) { return c.json({ message: 'updateBudget - 50% API OK (Not Implemented yet)' }, 501); }
export async function deleteBudget(c: Context) { return c.json({ message: 'deleteBudget - 50% API OK (Not Implemented yet)' }, 501); }


export async function getBudgetStatus(c: Context) {
    const budgetId = c.req.param('budgetId');
    
    try {
        const budget = BudgetModel.findById(budgetId);
        if (!budget) {
            return c.json({ error: 'Budget not found' }, 404);
        }

        // 1. LLAMADA SÍNCRONA: Ejecuta el Mock del cliente
        const totalSpent = await expensesClient.getTotalSpent(budget.groupId, budget.category);

        // 2. Lógica de cálculo
        const limit = budget.limitAmount;
        const percentage = (totalSpent / limit) * 100;

        return c.json({
            budgetId: budget._id,
            limitAmount: limit,
            totalSpent: totalSpent,
            percentageConsumed: Math.round(percentage),
            healthStatus: percentage > 100 ? 'OVERBUDGET' : (percentage > 80 ? 'WARNING' : 'OK'),
        });

    } catch (error) {
        console.error('Error getting budget status:', error);
        return c.json({ error: 'Failed to calculate status' }, 500);
    }
}