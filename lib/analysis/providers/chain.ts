import type { Analysis } from "../contract";
import { AnalysisError } from "../errors";
import type { AnalysisInput, AnalysisProvider } from "../provider";
import { withTimeout } from "../timeout";

/**
 * Cadena de proveedores con reintento y respaldo.
 *
 * - Intenta en orden: primario, después el de respaldo.
 * - Si solo hay uno, lo reintenta una vez.
 * - Cada intento tiene un techo de tiempo, para que la suma entre en
 *   `maxDuration` (30 s) y la persona no espere de más.
 */
export class FailoverProvider implements AnalysisProvider {
  readonly name: string;
  private readonly providers: AnalysisProvider[];
  private readonly maxAttempts: number;
  private readonly attemptTimeoutMs: number;

  constructor(
    providers: AnalysisProvider[],
    options: { maxAttempts?: number; attemptTimeoutMs?: number } = {},
  ) {
    if (providers.length === 0) throw new Error("La cadena de proveedores está vacía.");

    this.providers = providers;
    this.maxAttempts = options.maxAttempts ?? Math.max(2, providers.length);
    this.attemptTimeoutMs = options.attemptTimeoutMs ?? 10_000;
    this.name = providers.map((provider) => provider.name).join("->");
  }

  async analyze(input: AnalysisInput): Promise<Analysis> {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      const provider = this.providers[Math.min(attempt, this.providers.length - 1)];
      if (!provider) throw new Error("Cadena de proveedores inválida.");

      try {
        return await withTimeout(provider.analyze(input), this.attemptTimeoutMs);
      } catch (error) {
        lastError = error;
        const code = error instanceof AnalysisError ? error.code : "unknown";
        console.error(`[analysis] ${provider.name} falló en el intento ${attempt + 1}: ${code}`);
      }
    }

    throw lastError;
  }
}
