const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
    },
    lazyConnect: true,
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error:", err.message));

const connectRedis = async () => {
    try {
        await redis.connect();
    } catch (err) {
        console.error("Could not connect to Redis:", err.message);
    }
};

module.exports = redis;
module.exports.connectRedis = connectRedis;
