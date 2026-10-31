import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

type Mode =
  "ok" | "fenced" | "bad-json" | "http-500" | "http-400" | "slow" | "parts" | "reasoning" | "empty";
let mode: Mode = "ok";
let server: Server;
let baseUrl = "";
let lastBody: Record<string, unknown> = {};
let lastAuth = "";
let lastPath = "";

beforeAll(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      lastAuth = String(request.headers.authorization ?? "");
      lastPath = request.url ?? "";
      lastBody = JSON.parse(raw) as Record<string, unknown>;

      const send = (content: string) => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ choices: [{ message: { content } }] }));
      };

      const sendMessage = (message: unknown) => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ choices: [{ message }] }));
      };

      if (mode === "http-500") {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { message: "detalle interno que no debe salir" } }));
        return;
      }
      if (mode === "http-400") {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            error: {
              type: "invalid_request_error",
              code: "unsupported_parameter",
              param: "max_tokens",
              message: "mensaje interno que no debe salir",
            },
          }),
        );
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
      // Proveedores que devuelven el texto en partes.
      if (mode === "parts") {
        sendMessage({ content: [{ type: "text", text: JSON.stringify(FIXTURE) }] });
        return;
      }
      // Modelos que dejan el texto en reasoning_content y content vacío.
      if (mode === "reasoning") {
        sendMessage({ content: "", reasoning_content: JSON.stringify(FIXTURE) });
        return;
      }
      if (mode === "empty") {
        sendMessage({ content: "" });
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
    expect(lastBody.temperature).toBe(0);
    expect(lastBody.max_tokens).toBe(4096);

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

  it("acepta el texto cuando llega en partes", async () => {
    mode = "parts";
    const result = await provider().analyze(input);
    expect(result.verdict).toBe("señales_sospechosas");
  });

  it("usa reasoning_content si content viene vacío", async () => {
    mode = "reasoning";
    const result = await provider().analyze(input);
    expect(result.verdict).toBe("señales_sospechosas");
  });

  it("falla con invalid_response si no hay ningún texto", async () => {
    mode = "empty";
    await expect(provider().analyze(input)).rejects.toMatchObject({ code: "invalid_response" });
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

  it("diagnostica un 400 con el parámetro, sin volcar el mensaje", async () => {
    mode = "http-400";
    const logs: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    try {
      await provider().analyze(input);
    } catch {
      // Se espera el error.
    } finally {
      spy.mockRestore();
    }

    const output = logs.join("\n");
    expect(output).toContain("respondió 400");
    expect(output).toContain("param=max_tokens");
    expect(output).toContain("code=unsupported_parameter");
    expect(output).not.toContain("mensaje interno");
  });

  it("respeta el /v1 de la base de OpenAI", async () => {
    const openai = createOpenAiCompatibleProvider({
      name: "openai",
      baseUrl: `${baseUrl}/v1`,
      apiKey: "clave-de-prueba",
      model: "gpt-4o-mini",
    });

    await openai.analyze(input);
    expect(lastPath).toBe("/v1/chat/completions");
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
