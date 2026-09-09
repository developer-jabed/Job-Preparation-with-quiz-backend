// src/app/shared/queue.ts
import fp from "fastify-plugin";
import { Queue } from "bullmq";
import { Redis as IORedis } from "ioredis";
import type { FastifyInstance } from "fastify";

export default fp(async (fastify: FastifyInstance) => {
    const redisUrl = process.env.BULLMQ_REDIS_URL;
    if (!redisUrl) throw new Error("BULLMQ_REDIS_URL is required");

    // BullMQ requires these specific settings — this is intentionally a
    // separate connection from shared/redis.ts, not the same client.
    const bullConnection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });

    const smsQueue = new Queue("result-sms", { connection: bullConnection });

    fastify.decorate("smsQueue", smsQueue);

    fastify.addHook("onClose", async () => {
        await smsQueue.close();
        await bullConnection.quit();
    });
});