import { Hono } from 'hono';
import * as budgetController from '@/controllers/budgetController';

function loadBudgetsV1(app: Hono) {
  // POST / : Create a budget
  app.post('/v1/budgets', budgetController.createBudget);

  // GET /group/:groupId : List all budgets for a group
  app.get('/v1/budgets/group/:groupId', budgetController.listGroupBudgets);

  // PUT /:id : Update budget limit
  app.put('/v1/budgets/:id', budgetController.updateBudget);

  // GET /:id/status : Get budget status
  app.get('/v1/budgets/:id/status', budgetController.getBudgetStatus);
}

export default loadBudgetsV1;

