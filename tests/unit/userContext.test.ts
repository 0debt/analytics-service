import { expect, test } from 'bun:test';
import { getUserContext } from '@/helpers/userContext';

// Minimal mock of Hono Context req.header interface
function makeContext(authorization?: string) {
    return {
        req: {
            header: (name: string) => (name.toLowerCase() === 'authorization' ? authorization : undefined),
        },
    } as any;
}

test('getUserContext returns userId and plan from JWT', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwicGxhbiI6IlBSTyJ9.fake';
    const ctx = makeContext(`Bearer ${token}`);

    const result = getUserContext(ctx);

    expect(result).not.toBeNull();
    expect(result?.userId).toBe('test-user-123');
    expect(result?.plan).toBe('PRO');
});

test('getUserContext returns null for invalid or missing token', () => {
    // Missing header
    expect(getUserContext(makeContext())).toBeNull();

    // Malformed token
    const ctx = makeContext('Bearer not-a-jwt');
    expect(getUserContext(ctx)).toBeNull();
});


