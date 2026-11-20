"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

/**
 * Puerta de acceso del piloto. El código se valida en el servidor; acá solo se
 * guarda el estado de la sesión (la cookie es HttpOnly, el JS no la lee).
 */
type State = "checking" | "locked" | "granted";

type AccessContextValue = {
  /** Vuelve a bloquear la puerta. La usa el análisis cuando la sesión venció. */
  relock: (reason?: string) => void;
};

const AccessContext = createContext<AccessContextValue | null>(null);

/** `null` cuando el árbol no está dentro de `AccessGate` (por ejemplo, en tests). */
export function useAccessGate(): AccessContextValue | null {
  return useContext(AccessContext);
}

export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

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

  const relock = useCallback((reason?: string) => {
    setCode("");
    setError(null);
    setNotice(reason ?? null);
    setState("locked");
  }, []);

  const contextValue = useMemo(() => ({ relock }), [relock]);

  // Al volver a bloquear por sesión vencida, el foco va al campo: la persona
  // no tiene que buscarlo.
  useEffect(() => {
    if (state === "locked" && notice) inputRef.current?.focus();
  }, [state, notice]);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busy) return;

      setBusy(true);
      setError(null);
      setNotice(null);

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
          setCode("");
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

  return (
    <AccessContext.Provider value={contextValue}>
      {state === "checking" && (
        <p className="hint" role="status">
          Un momento…
        </p>
      )}

      {state === "granted" && children}

      {state === "locked" && (
        <section className="gate" aria-labelledby="acceso-titulo">
          <h2 id="acceso-titulo">Código de acceso</h2>
          <p className="hint">
            AnalIA está en prueba con un grupo chico. Escribí el código que te dio la persona que te
            invitó.
          </p>

          {notice && (
            <p className="gate__notice" role="status">
              {notice}
            </p>
          )}

          <form className="gate__form" onSubmit={submit}>
            <label className="gate__label" htmlFor="codigo-acceso">
              Tu código
            </label>
            <input
              ref={inputRef}
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
      )}
    </AccessContext.Provider>
  );
}
