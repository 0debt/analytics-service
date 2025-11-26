import { Hono } from 'hono';
import * as budgetController from '@/controllers/budgetController';

function loadBudgetsV1(app: Hono) {
  // POST / : Crear un presupuesto
  app.post('/v1/budgets', budgetController.createBudget);

  // GET /group/:groupId : Listar todos los presupuestos de un grupo
  app.get('/v1/budgets/group/:groupId', budgetController.listGroupBudgets);

  // PUT /:id : Modificar el límite
  app.put('/v1/budgets/:id', budgetController.updateBudget);

  // GET /:id/status : Obtener estado del presupuesto
  app.get('/v1/budgets/:id/status', budgetController.getBudgetStatus);
}

export default loadBudgetsV1;

