"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

/**
 * Puerta de acceso del piloto. El código se valida en el servidor; acá solo se
 * guarda el estado de la sesión (la cookie es HttpOnly, el JS no la lee).
 */
type State = "checking" | "locked" | "granted";

export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/access", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ granted?: boolean }>)
      .then((data) => {
        if (active) setState(data.granted ? "granted" : "locked");
      })
      .catch(() => {
        if (active) setState("locked");
      });

    return () => {
      active = false;
    };
  }, []);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busy) return;

      setBusy(true);
      setError(null);

      try {
        const response = await fetch("/api/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = (await response.json().catch(() => null)) as {
          granted?: boolean;
          error?: { message?: string };
        } | null;

        if (response.ok && data?.granted) {
          setState("granted");
          return;
        }

        setError(data?.error?.message ?? "No pudimos verificar el código. Probá de nuevo.");
      } catch {
        setError("No pudimos conectarnos. Revisá tu conexión y probá de nuevo.");
      } finally {
        setBusy(false);
      }
    },
    [busy, code],
  );

  if (state === "checking") {
    return (
      <p className="hint" role="status">
        Un momento…
      </p>
    );
  }

  if (state === "granted") return <>{children}</>;

  return (
    <section className="gate" aria-labelledby="acceso-titulo">
      <h2 id="acceso-titulo">Código de acceso</h2>
      <p className="hint">
        AnalIA está en prueba con un grupo chico. Escribí el código que te dio la persona que te
        invitó.
      </p>

      <form className="gate__form" onSubmit={submit}>
        <label className="gate__label" htmlFor="codigo-acceso">
          Tu código
        </label>
        <input
          id="codigo-acceso"
          className="field"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
          aria-describedby={error ? "acceso-error" : "acceso-ayuda"}
          required
        />
        <p className="hint" id="acceso-ayuda">
          No distingue mayúsculas de minúsculas.
        </p>

        {error && (
          <p className="uploader__error" id="acceso-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="button" disabled={busy || code.trim().length === 0}>
          {busy ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </section>
  );
}
