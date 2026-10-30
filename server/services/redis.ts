import Redis from 'ioredis';

/**
 * Cliente Redis centralizado para BJJ Rats.
 * Projetado para suportar alta escala (100k - 200k usuários).
 *
 * Características:
 * - Graceful Fallback: Se REDIS_URL não for informada (ex: dev local sem Redis),
 *   o sistema opera normalmente consultando o PostgreSQL sem falhar.
 * - Auto-reconexão e resiliência a falhas de rede transitórias.
 * - Proteção de timeout para que a API nunca fique travada esperando o cache.
 */

const REDIS_URL = process.env.REDIS_URL;

let redisClient: Redis | null = null;
let isConnected = false;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      enableOfflineQueue: false, // Falha rápido se estiver desconectado, evitando pendurar requisições HTTP
      lazyConnect: false,
      retryStrategy(times) {
        // Backoff exponencial com teto de 10s
        const delay = Math.min(times * 500, 10000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('[redis] Conectado ao cluster/instância Redis com sucesso.');
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      console.warn('[redis] Aviso de conexão Redis (fallback ativo):', err.message);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });
  } catch (err: any) {
    console.warn('[redis] Não foi possível inicializar cliente Redis:', err?.message);
    redisClient = null;
    isConnected = false;
  }
} else {
  console.log('[redis] REDIS_URL não configurado. Cache em memória desativado (fallback transparente para Postgres).');
}

export function isRedisAvailable(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Busca dado em cache no Redis. Retorna null se não encontrar ou se o Redis estiver indisponível.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisClient || !isConnected) return null;
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    return null;
  }
}

/**
 * Salva dado em cache no Redis com TTL em segundos (padrão: 60s).
 */
export async function setCache(key: string, data: any, ttlSeconds: number = 60): Promise<void> {
  if (!redisClient || !isConnected) return;
  try {
    const serialized = JSON.stringify(data);
    await redisClient.setex(key, ttlSeconds, serialized);
  } catch (err) {
    // Ignora erro silenciosamente para não prejudicar o fluxo principal da aplicação
  }
}

/**
 * Remove uma chave do cache.
 */
export async function deleteCache(key: string): Promise<void> {
  if (!redisClient || !isConnected) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    // Silencia erro
  }
}

/**
 * Invalida chaves por padrão usando SCAN (não bloqueante para o Redis).
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redisClient || !isConnected) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    // Silencia erro
  }
}

/**
 * Invalida todos os caches relacionados ao feed de posts da comunidade/academia.
 */
export async function invalidateFeedCache(): Promise<void> {
  await deleteCachePattern('feed:*');
}

export { redisClient };

