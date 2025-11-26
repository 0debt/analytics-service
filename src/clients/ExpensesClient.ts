import { env } from 'hono/adapter'; 
 
export class ExpensesClient {
  private EXPENSES_SERVICE_URL: string;

  constructor() {
    this.EXPENSES_SERVICE_URL = Bun.env.EXPENSES_SERVICE_URL || 'http://localhost:3000';
  }


  //MOCK: Obtener la suma total de gastos para un grupo.
  public async getTotalSpent(groupId: string, category?: string): Promise<number> {
    
    if (this.EXPENSES_SERVICE_URL.includes('localhost:3000')) {
        console.log(`[MOCK ACTIVO] Devolviendo 150.00 para grupo ${groupId}`);
        return 150.00; // Valor fijo para la prueba
    }

    // --- Para fetch real: ---
    console.log(`[PROD] Llamando a ${this.EXPENSES_SERVICE_URL}/internal/expenses/stats`);

    return 0; // Fallback
  }
}

export const expensesClient = new ExpensesClient();