import { Context } from 'hono';
import { jwtDecode } from 'jwt-decode';

/** User context extracted from JWT token */
export interface UserContext {
    userId: string;
    plan: string;
}

interface JwtPayload {
    sub?: string;
    userId?: string;
    plan?: string;
}

/**
 * Extracts user context from Authorization header JWT token.
 * Does not verify signature (trusts Kong gateway).
 * @param c - Hono context
 * @returns User context or null if token is missing/invalid
 */
export function getUserContext(c: Context): UserContext | null {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.substring(7);
        const decoded = jwtDecode<JwtPayload>(token);
        return {
            userId: decoded.sub || decoded.userId || 'anonymous',
            plan: decoded.plan || 'FREE'
        };
    } catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
}

