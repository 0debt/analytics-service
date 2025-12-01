import CircuitBreaker from 'opossum';

/** Stats response from expenses-service */
export interface GroupStats {
    totalSpent: number;
    byCategory: Record<string, number>;
}

/** Circuit breaker configuration */
const breakerOptions = {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000
};

/**
 * Fetches group stats from expenses-service.
 * @param groupId - Group identifier
 * @returns Group statistics or null on failure
 */
async function _fetchGroupStats(groupId: string): Promise<GroupStats | null> {
    const serviceUrl = Bun.env.EXPENSES_SERVICE_URL;

    const response = await fetch(`${serviceUrl}/api/v1/internal/stats/${groupId}`);

    if (response.status === 200) {
        const data = await response.json() as { status: string; data: GroupStats };
        return data.data;
    }

    throw new Error(`Expenses service responded with status ${response.status}`);
}

const breaker = new CircuitBreaker(_fetchGroupStats, breakerOptions);

breaker.fallback(() => {
    console.warn("Circuit Breaker Fallback: expenses-service unavailable");
    return null;
});

breaker.on('open', () => console.log('Circuit Breaker OPEN: expenses-service appears down'));
breaker.on('close', () => console.log('Circuit Breaker CLOSED: expenses-service recovered'));

/**
 * Returns mock data for testing/development.
 */
function getMockStats(): GroupStats {
    console.warn("WARN: Using Mock Data (EXPENSES_SERVICE_URL not configured)");
    return {
        totalSpent: 150.00,
        byCategory: { FOOD: 80, TRANSPORT: 40, OTHER: 30 }
    };
}

/**
 * Gets group statistics with circuit breaker protection.
 * Uses mock data automatically if EXPENSES_SERVICE_URL is not defined.
 * @param groupId - Group identifier
 * @returns Group stats, mock data, or null on failure
 */
export async function getGroupStats(groupId: string): Promise<GroupStats | null> {
    if (!Bun.env.EXPENSES_SERVICE_URL) {
        return getMockStats();
    }

    return breaker.fire(groupId);
}

/**
 * Gets total spent for a group.
 * @param groupId - Group identifier
 * @returns Total amount spent or 0 on failure
 */
export async function getTotalSpent(groupId: string): Promise<number> {
    const stats = await getGroupStats(groupId);
    return stats?.totalSpent ?? 0;
}
