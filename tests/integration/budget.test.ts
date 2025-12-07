import { test, expect, afterAll, describe } from 'bun:test';

const API_URL = Bun.env.API_URL || 'http://localhost:3000';

// Test JWT token (decoded: { sub: "test-user-123", plan: "PRO" })
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwicGxhbiI6IlBSTyJ9.fake';

let createdBudgetId: string;

afterAll(async () => {
    // Cleanup test data
    if (createdBudgetId) {
        await fetch(`${API_URL}/v1/budgets/${createdBudgetId}`, { method: 'DELETE' }).catch(() => {});
    }
});

// ============== HEALTH CHECK ==============
describe('Health Check', () => {
    test('1. GET /v1/health should return healthy status', async () => {
        const res = await fetch(`${API_URL}/v1/health`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('healthy');
    });
});

// ============== CREATE BUDGET ==============
describe('POST /v1/budgets', () => {
    test('2. should create a budget with valid data', async () => {
        const res = await fetch(`${API_URL}/v1/budgets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_TOKEN}`
            },
            body: JSON.stringify({
                groupId: 'test-group',
                category: 'Food',
                limitAmount: 500,
                period: 'monthly',
            }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body._id).toBeDefined();
        expect(body.groupId).toBe('test-group');
        expect(body.userId).toBeDefined();
        createdBudgetId = body._id;
    });

    test('3. should fail without Authorization header', async () => {
        const res = await fetch(`${API_URL}/v1/budgets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: 'test-group',
                limitAmount: 500,
                period: 'monthly',
            }),
        });

        expect(res.status).toBe(401);
    });

    test('4. should fail with missing groupId', async () => {
        const res = await fetch(`${API_URL}/v1/budgets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_TOKEN}`
            },
            body: JSON.stringify({
                limitAmount: 500,
                period: 'monthly',
            }),
        });

        expect(res.status).toBe(400);
    });

    test('7. should fail with invalid JSON', async () => {
        const res = await fetch(`${API_URL}/v1/budgets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_TOKEN}`
            },
            body: 'invalid json',
        });

        expect(res.status).toBe(400);
    });
});

// ============== LIST BUDGETS ==============
describe('GET /v1/budgets/group/:groupId', () => {
    test('8. should list budgets for a group', async () => {
        const res = await fetch(`${API_URL}/v1/budgets/group/test-group`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.groupId).toBe('test-group');
        expect(Array.isArray(body.budgets)).toBe(true);
        expect(typeof body.count).toBe('number');
    });

    test('9. should return empty array for non-existent group', async () => {
        const res = await fetch(`${API_URL}/v1/budgets/group/non-existent-group`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.budgets).toEqual([]);
        expect(body.count).toBe(0);
    });
});

// ============== UPDATE BUDGET ==============
describe('PUT /v1/budgets/:id', () => {
    test('10. should update budget limitAmount', async () => {
        if (!createdBudgetId) return;

        const res = await fetch(`${API_URL}/v1/budgets/${createdBudgetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limitAmount: 750 }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.limitAmount).toBe(750);
    });

    test('11. should return 404 for non-existent budget', async () => {
        const res = await fetch(`${API_URL}/v1/budgets/507f1f77bcf86cd799439011`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limitAmount: 100 }),
        });

        expect(res.status).toBe(404);
    });

    test('12. should fail with no valid fields', async () => {
        if (!createdBudgetId) return;

        const res = await fetch(`${API_URL}/v1/budgets/${createdBudgetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invalidField: 'value' }),
        });

        expect(res.status).toBe(400);
    });
});

// ============== BUDGET STATUS ==============
describe('GET /v1/budgets/:id/status', () => {
    test('13. should return budget status with health indicator', async () => {
        if (!createdBudgetId) return;

        const res = await fetch(`${API_URL}/v1/budgets/${createdBudgetId}/status`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.limit).toBeDefined();
        expect(body.spent).toBeDefined();
        expect(['OK', 'WARNING', 'OVERBUDGET']).toContain(body.health);
    });

    test('14. should return 404 for non-existent budget', async () => {
        const res = await fetch(`${API_URL}/v1/budgets/507f1f77bcf86cd799439011/status`);
        expect(res.status).toBe(404);
    });
});

// ============== DELETE BUDGET ==============
describe('DELETE /v1/budgets/:id', () => {
    test('15. should delete an existing budget', async () => {
        // Create a budget to delete
        const createRes = await fetch(`${API_URL}/v1/budgets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TEST_TOKEN}`
            },
            body: JSON.stringify({
                groupId: 'delete-test-group',
                limitAmount: 100,
                period: 'weekly',
            }),
        });
        const created = await createRes.json();
        const budgetToDelete = created._id;

        const res = await fetch(`${API_URL}/v1/budgets/${budgetToDelete}`, {
            method: 'DELETE',
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('ok');
    });

    test('16. should return 404 for non-existent budget', async () => {
        const res = await fetch(`${API_URL}/v1/budgets/507f1f77bcf86cd799439011`, {
            method: 'DELETE',
        });

        expect(res.status).toBe(404);
    });
});

// ============== CHART ENDPOINT ==============
describe('GET /v1/budgets/:id/chart', () => {
    test('17. should return chart URL when ENABLE_CHARTS=true', async () => {
        if (!createdBudgetId) return;
        if (Bun.env.ENABLE_CHARTS !== 'true') return;

        const res = await fetch(`${API_URL}/v1/budgets/${createdBudgetId}/chart`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.url).toContain('quickchart.io');
    });

    test('18. should return 503 when ENABLE_CHARTS=false', async () => {
        if (!createdBudgetId) return;
        // Only validate 503 when feature is explicitly disabled
        if (Bun.env.ENABLE_CHARTS !== 'false') return;

        const res = await fetch(`${API_URL}/v1/budgets/${createdBudgetId}/chart`);

        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.error).toBe('Feature Disabled');
    });
});

// ============== SAGA: DELETE USER BUDGETS ==============
describe('DELETE /v1/internal/users/:userId (SAGA)', () => {
    test('19. should delete all budgets for a user', async () => {
        // Create budgets for saga test user
        const sagaToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzYWdhLXRlc3QtdXNlciIsInBsYW4iOiJGUkVFIn0.fake';

        await fetch(`${API_URL}/v1/budgets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sagaToken}`
            },
            body: JSON.stringify({
                groupId: 'saga-group-1',
                limitAmount: 100,
                period: 'monthly',
            }),
        });

        await fetch(`${API_URL}/v1/budgets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sagaToken}`
            },
            body: JSON.stringify({
                groupId: 'saga-group-2',
                limitAmount: 200,
                period: 'weekly',
            }),
        });

        // Execute SAGA delete
        const res = await fetch(`${API_URL}/v1/internal/users/saga-test-user`, {
            method: 'DELETE',
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('ok');
        expect(body.deletedCount).toBeGreaterThanOrEqual(2);
    });

    test('20. should return 200 even with no budgets to delete', async () => {
        const res = await fetch(`${API_URL}/v1/internal/users/non-existent-user-12345`, {
            method: 'DELETE',
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('ok');
        expect(body.deletedCount).toBe(0);
    });
});


