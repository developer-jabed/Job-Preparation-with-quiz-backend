// src/app/shared/redis.ts
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || process.env.BULLMQ_REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL (or BULLMQ_REDIS_URL) is required");

// Singleton client — plain service functions (auth.service.ts etc.) import
// this directly since they don't have access to the fastify instance.
export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
});

redis.on("error", (err: Error) => {
    console.error("Redis connection error:", err.message);
});

redis.on("connect", () => {
    console.log("Redis connected");
});