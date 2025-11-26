export class expensesClient {
  async getTotalSpent(groupId: string): Promise<number> {
    // TODO: Replace with real fetch when Pair 3 finishes
    return 150.00; // Returns a fixed value to test the logic
  }
}

export const expensesClientInstance = new expensesClient();
