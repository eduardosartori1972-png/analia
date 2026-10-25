/**
 * Rate limit en memoria, por instancia. En Vercel cada instancia tiene su propio
 * contador: sirve para frenar abuso casual y bucles, no como defensa distribuida.
 * Queda anotado en el modelo de amenazas (T-06) para revisar antes del piloto.
 */

export type RateLimitDecision =
  { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = (key: string, now?: number) => RateLimitDecision;

type Options = {
  limit: number;
  windowMs: number;
  maxKeys?: number;
};

export function createRateLimiter({ limit, windowMs, maxKeys = 10_000 }: Options): RateLimiter {
  const hits = new Map<string, number[]>();

  return (key, now = Date.now()) => {
    const since = now - windowMs;
    const recent = (hits.get(key) ?? []).filter((timestamp) => timestamp > since);

    if (recent.length >= limit) {
      const oldest = recent[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    recent.push(now);
    hits.set(key, recent);

    // Poda barata para que el mapa no crezca sin límite.
    if (hits.size > maxKeys) {
      for (const [storedKey, timestamps] of hits) {
        if (timestamps.every((timestamp) => timestamp <= since)) hits.delete(storedKey);
      }
    }

    return { allowed: true, remaining: limit - recent.length };
  };
}
