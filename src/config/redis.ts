import Redis from "ioredis";

const redisUrl = Bun.env.REDIS_URL || "redis://localhost:6379";

let errorLogged = false;

/**
 * Redis client instance for caching operations.
 * Configured with retry strategy and single error logging.
 */
export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
        if (times > 3) {
            // Stop retrying after 3 attempts
            return null;
        }
        return Math.min(times * 100, 2000);
    },
    lazyConnect: true,
});

redis.on("connect", () => {
    errorLogged = false;
    console.log("Connected to Redis");
});

redis.on("error", (err: Error) => {
    if (!errorLogged) {
        console.warn(`Redis unavailable: ${err.message} - Cache disabled, using fallback`);
        errorLogged = true;
    }
});

// Try to connect, but don't block if it fails
redis.connect().catch(() => {});
