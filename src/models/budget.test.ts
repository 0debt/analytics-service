import { test, expect, beforeAll, afterAll } from 'bun:test';

const API_URL = process.env.API_URL || 'http://localhost:3001';
let createdBudgetId: string;

afterAll(async () => {
  // Clean up: delete test data via API
  if (createdBudgetId) {
    try {
      await fetch(`${API_URL}/v1/budgets/${createdBudgetId}`, { method: 'DELETE' });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

test('should connect to server', async () => {
  const res = await fetch(`${API_URL}/v1/health`);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('healthy');
});

// POST /v1/budgets - Create a budget
test('POST /v1/budgets should create a budget', async () => {
  const budgetData = {
    groupId: 'test-group',
    category: 'Food',
    limitAmount: 500,
    period: 'monthly',
  };

  const res = await fetch(`${API_URL}/v1/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(budgetData),
  });

  expect(res.status).toBe(201);

  const body = await res.json();
  expect(body._id).toBeDefined();
  expect(body.groupId).toBe(budgetData.groupId);
  expect(body.category).toBe(budgetData.category);
  expect(body.limitAmount).toBe(budgetData.limitAmount);
  expect(body.period).toBe(budgetData.period);

  createdBudgetId = body._id;
});

// GET /v1/budgets/group/:groupId - List budgets by group
test('GET /v1/budgets/group/:groupId should list budgets by group', async () => {
  const res = await fetch(`${API_URL}/v1/budgets/group/test-group`);

  expect(res.status).toBe(200);

  const body = await res.json();
  expect(body.groupId).toBe('test-group');
  expect(body.budgets).toBeInstanceOf(Array);
  expect(body.count).toBeGreaterThan(0);
  expect(body.budgets[0].groupId).toBe('test-group');
});

// PUT /v1/budgets/:id - Update budget limit
test('PUT /v1/budgets/:id should update budget limit', async () => {
  if (!createdBudgetId) {
    // Create a budget if not exists
    const res = await fetch(`${API_URL}/v1/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: 'test-group',
        category: 'Food',
        limitAmount: 500,
        period: 'monthly',
      }),
    });
    const body = await res.json();
    createdBudgetId = body._id;
  }

  const updateData = {
    limitAmount: 750,
  };

  const res = await fetch(`${API_URL}/v1/budgets/${createdBudgetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });

  expect(res.status).toBe(200);

  const body = await res.json();
  expect(body.limitAmount).toBe(750);
  expect(body._id.toString()).toBe(createdBudgetId);
});

// GET /v1/budgets/:id/status - Get budget status
test('GET /v1/budgets/:id/status should get budget status', async () => {
  if (!createdBudgetId) {
    // Create a budget if not exists
    const res = await fetch(`${API_URL}/v1/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: 'test-group',
        category: 'Food',
        limitAmount: 200,
        period: 'monthly',
      }),
    });
    const body = await res.json();
    createdBudgetId = body._id;
  }

  const res = await fetch(`${API_URL}/v1/budgets/${createdBudgetId}/status`);

  expect(res.status).toBe(200);

  const body = await res.json();
  expect(body.limit).toBeDefined();
  expect(body.spent).toBe(150.00); // Mock value from expensesClient
  expect(body.health).toBeDefined();
  expect(['OK', 'WARNING', 'OVERBUDGET']).toContain(body.health);
});

// Test validation - required fields
test('POST /v1/budgets should fail with missing required fields', async () => {
  const invalidData = {
    groupId: 'test-group',
    // Missing limitAmount and period
  };

  const res = await fetch(`${API_URL}/v1/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidData),
  });

  expect(res.status).toBe(400);

  const body = await res.json();
  expect(body.error).toBeDefined();
});
