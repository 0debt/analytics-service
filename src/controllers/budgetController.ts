import { Context } from 'hono';
import { Budget } from '@/models/budgetSchema';
import { expensesClientInstance } from '@/clients/expensesClient';

// POST / : Create a budget
export async function createBudget(c: Context) {
    try {
        let body;
        try {
            body = await c.req.json();
        } catch (parseError: any) {
            return c.json({ 
                error: 'Invalid JSON format',
                details: parseError.message 
            }, 400);
        }

        const { groupId, category, limitAmount, period } = body;

        if (!groupId || limitAmount === undefined || !period) {
            return c.json({ 
                error: 'Missing required fields: groupId, limitAmount, period' 
            }, 400);
        }

        const budget = new Budget({
            groupId,
            category,
            limitAmount,
            period,
        });

        const savedBudget = await budget.save();
        return c.json(savedBudget, 201);
    } catch (error: any) {
        console.error('Error creating budget:', error);
        if (error.name === 'ValidationError') {
            return c.json({ error: 'Validation error', details: error.message }, 400);
        }
        return c.json({ error: 'Failed to create budget', details: error.message }, 500);
    }
}

// GET /group/:groupId : List all budgets for a group
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

// PUT /:id : Update budget limit
export async function updateBudget(c: Context) {
    try {
        const budgetId = c.req.param('id');
        const body = await c.req.json();

        // Only allow updating limitAmount
        const updateData: any = {};
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
    } catch (error: any) {
        console.error('Error updating budget:', error);
        if (error.name === 'ValidationError') {
            return c.json({ error: 'Validation error', details: error.message }, 400);
        }
        return c.json({ error: 'Failed to update budget' }, 500);
    }
}

// GET /:id/status : Get budget status
export async function getBudgetStatus(c: Context) {
    const budgetId = c.req.param('id');
    
    try {
        const budget = await Budget.findById(budgetId);
        if (!budget) {
            return c.json({ error: 'Budget not found' }, 404);
        }

        // Use mock to get total spent
        const spent = await expensesClientInstance.getTotalSpent(budget.groupId);

        return c.json({
            limit: budget.limitAmount,
            spent: spent,
            health: spent > budget.limitAmount ? 'OVERBUDGET' : (spent > budget.limitAmount * 0.8 ? 'WARNING' : 'OK'),
        }, 200);

    } catch (error) {
        console.error('Error getting budget status:', error);
        return c.json({ error: 'Failed to calculate status' }, 500);
    }
}

