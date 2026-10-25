/**
 * Presupuesto mensual de consultas. Es un contador en memoria, igual que el
 * rate limit: en Vercel cada instancia lleva el suyo. Sirve para que un bug o
 * una prueba intensa no vacíe la cuenta, no como contabilidad exacta.
 *
 * El límite efectivo combina dos topes:
 * - `limit`: cantidad de consultas por mes (100 por defecto).
 * - `budgetUsd / costPerCallUsd`: si se conoce el costo por consulta, el
 *   presupuesto manda. Sin costo configurado, solo aplica el tope de cantidad.
 */

export type BudgetDecision =
  | { allowed: true; remaining: number; limit: number }
  | { allowed: false; remaining: 0; limit: number };

export type MonthlyBudget = (now?: Date) => BudgetDecision;

export function createMonthlyBudget(limit: number): MonthlyBudget {
  let currentKey = "";
  let used = 0;

  return (now = new Date()) => {
    const key = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
    if (key !== currentKey) {
      currentKey = key;
      used = 0;
    }

    if (used >= limit) return { allowed: false, remaining: 0, limit };

    used += 1;
    return { allowed: true, remaining: limit - used, limit };
  };
}

/** Traduce variables de entorno a un límite de consultas por mes. */
export function resolveMonthlyLimit(
  env: Partial<NodeJS.ProcessEnv> = process.env,
  fallbackLimit = 100,
): number {
  const count = Number(env.ANALYZE_MONTHLY_LIMIT ?? fallbackLimit);
  const budget = Number(env.ANALYZE_MONTHLY_BUDGET_USD ?? 0);
  const cost = Number(env.ANALYZE_COST_PER_CALL_USD ?? 0);

  const byCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : fallbackLimit;
  const byBudget =
    Number.isFinite(budget) && budget > 0 && Number.isFinite(cost) && cost > 0
      ? Math.floor(budget / cost)
      : byCount;

  return Math.max(1, Math.min(byCount, byBudget));
}
