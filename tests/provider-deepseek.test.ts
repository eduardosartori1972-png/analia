import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AnalysisError } from "@/lib/analysis/errors";
import { createOpenAiCompatibleProvider } from "@/lib/analysis/providers/openai-compatible";

/**
 * El adaptador se prueba contra un servidor local que imita la API. No se toca
 * la red real ni se necesita clave.
 */

const FIXTURE = {
  verdict: "señales_sospechosas",
  title: "Hay señales sospechosas",
  summary: "El mensaje pide entrar a un link y apura con una amenaza.",
  reasons: ["Pide un link.", "Apura con un plazo corto."],
  nextSteps: ["No toques el link.", "Verificá por el canal oficial."],
  limits: "No puedo confirmar que sea una estafa.",
  escalation: "banking",
  hardData: { urls: [], phones: [], senders: [] },
};

type Mode = "ok" | "fenced" | "bad-json" | "http-500" | "slow";
let mode: Mode = "ok";
let server: Server;
let baseUrl = "";
let lastBody: Record<string, unknown> = {};
let lastAuth = "";

beforeAll(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      lastAuth = String(request.headers.authorization ?? "");
      lastBody = JSON.parse(raw) as Record<string, unknown>;

      const send = (content: string) => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ choices: [{ message: { content } }] }));
      };

      if (mode === "http-500") {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { message: "detalle interno que no debe salir" } }));
        return;
      }
      if (mode === "slow") {
        setTimeout(() => send(JSON.stringify(FIXTURE)), 300);
        return;
      }
      if (mode === "bad-json") {
        send("Lo siento, no puedo analizar esto.");
        return;
      }
      if (mode === "fenced") {
        send("```json\n" + JSON.stringify(FIXTURE) + "\n```");
        return;
      }
      send(JSON.stringify(FIXTURE));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  mode = "ok";
  lastBody = {};
  lastAuth = "";
});

const provider = () =>
  createOpenAiCompatibleProvider({
    name: "deepseek",
    baseUrl,
    apiKey: "clave-de-prueba",
    model: "deepseek-flash",
  });

const input = { image: { bytes: new Uint8Array([1, 2, 3, 4]), mimeType: "image/jpeg" } };

describe("adaptador compatible con OpenAI", () => {
  it("manda la clave en el header y no en el cuerpo", async () => {
    await provider().analyze(input);

    expect(lastAuth).toBe("Bearer clave-de-prueba");
    expect(JSON.stringify(lastBody)).not.toContain("clave-de-prueba");
  });

  it("arma el request con el modelo, el system prompt y la imagen como data URL", async () => {
    await provider().analyze(input);

    expect(lastBody.model).toBe("deepseek-flash");
    expect(lastBody.response_format).toEqual({ type: "json_object" });
    expect(lastBody.stream).toBe(false);

    const messages = lastBody.messages as Array<{ role: string; content: unknown }>;
    expect(messages[0]?.role).toBe("system");
    expect(String(messages[0]?.content)).toContain("AnalIA");

    const parts = messages[1]?.content as Array<{ type: string; image_url?: { url: string } }>;
    const image = parts.find((part) => part.type === "image_url");
    expect(image?.image_url?.url).toBe("data:image/jpeg;base64,AQIDBA==");
  });

  it("devuelve el análisis cuando la respuesta es JSON", async () => {
    const result = await provider().analyze(input);
    expect(result.verdict).toBe("señales_sospechosas");
  });

  it("tolera el JSON envuelto en un bloque markdown", async () => {
    mode = "fenced";
    const result = await provider().analyze(input);
    expect(result.verdict).toBe("señales_sospechosas");
  });

  it("no propaga el cuerpo del error del proveedor", async () => {
    mode = "http-500";

    await expect(provider().analyze(input)).rejects.toBeInstanceOf(AnalysisError);
    await expect(provider().analyze(input)).rejects.toMatchObject({ code: "provider_error" });

    try {
      await provider().analyze(input);
    } catch (error) {
      expect(String((error as Error).message)).not.toContain("detalle interno");
    }
  });

  it("falla con invalid_response si el contenido no es JSON", async () => {
    mode = "bad-json";
    await expect(provider().analyze(input)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("corta por timeout cuando el proveedor no responde a tiempo", async () => {
    mode = "slow";

    const slow = createOpenAiCompatibleProvider({
      name: "deepseek",
      baseUrl,
      apiKey: "clave-de-prueba",
      model: "deepseek-flash",
      timeoutMs: 50,
    });

    await expect(slow.analyze(input)).rejects.toMatchObject({ code: "timeout" });
  });
});
