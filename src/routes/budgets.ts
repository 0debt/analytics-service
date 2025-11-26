import { Hono } from 'hono';
import * as BudgetController from '../controllers/budgetController';

const budgetsRouter = new Hono();
// 1. RUTA BASE GET
budgetsRouter.get('/', BudgetController.listAllBudgets); 

budgetsRouter.get('/:budgetId/status', BudgetController.getBudgetStatus);
// CRUD BÁSICO
budgetsRouter.post('/', BudgetController.createBudget); // Crear (POST /budgets)
budgetsRouter.get('/group/:groupId', BudgetController.listGroupBudgets); // Listar (GET /budgets/group/:groupId)
budgetsRouter.put('/:budgetId', BudgetController.updateBudget); // Actualizar (PUT /budgets/:budgetId)
budgetsRouter.delete('/:budgetId', BudgetController.deleteBudget); // Eliminar (DELETE /budgets/:budgetId)

// Obtener estado - síncrono
budgetsRouter.get('/:budgetId/status', BudgetController.getBudgetStatus); 

export default budgetsRouter;