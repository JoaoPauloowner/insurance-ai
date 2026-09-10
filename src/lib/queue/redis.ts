import Redis from 'ioredis';

let redisInstance: Redis | null = null;

export function getRedisConnection(): Redis | null {
  if (redisInstance) {
    return redisInstance;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  try {
    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    return redisInstance;
  } catch (error) {
    console.warn('[Redis] Conexão falhou, operando em modo fallback sem fila assíncrona:', error);
    return null;
  }
}
