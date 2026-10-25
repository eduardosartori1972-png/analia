import type { Analysis } from "./contract";

/**
 * Frontera con el proveedor de visión (ADR-004). Nada específico de un
 * proveedor puede filtrarse más allá de `providers/`.
 */
export type AnalysisInput = {
  image: {
    bytes: Uint8Array;
    mimeType: string;
  };
};

export interface AnalysisProvider {
  readonly name: string;
  analyze(input: AnalysisInput): Promise<Analysis>;
}
