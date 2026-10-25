import { describe, expect, it } from "vitest";

import { fitWithin, formatBytes } from "@/lib/image/geometry";
import { MAX_INPUT_BYTES, validateFile } from "@/lib/image/rules";

describe("fitWithin", () => {
  it("no agranda una imagen que ya entra en el presupuesto", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("achica una captura de teléfono por el lado mayor", () => {
    expect(fitWithin(1080, 2400, 1600)).toEqual({ width: 720, height: 1600 });
  });

  it("achica una imagen apaisada por el ancho", () => {
    expect(fitWithin(4000, 1000, 1600)).toEqual({ width: 1600, height: 400 });
  });

  it("mantiene la proporción dentro de un píxel por redondeo", () => {
    const result = fitWithin(1000, 333, 320);
    expect(result.width).toBe(320);
    expect(Math.abs(result.height - 106.56)).toBeLessThanOrEqual(1);
  });

  it("nunca devuelve cero en imágenes extremas", () => {
    expect(fitWithin(5000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });

  it("rechaza dimensiones inválidas", () => {
    expect(() => fitWithin(0, 100, 1600)).toThrow(RangeError);
    expect(() => fitWithin(Number.NaN, 100, 1600)).toThrow(RangeError);
    expect(() => fitWithin(100, 100, 0)).toThrow(RangeError);
  });
});

describe("formatBytes", () => {
  it("usa coma decimal, como se lee en Argentina", () => {
    expect(formatBytes(3.4 * 1024 * 1024)).toBe("3,4 MB");
  });

  it("muestra bytes y kilobytes", () => {
    expect(formatBytes(850)).toBe("850 B");
    expect(formatBytes(412 * 1024)).toBe("412 KB");
  });

  it("rechaza tamaños negativos", () => {
    expect(() => formatBytes(-1)).toThrow(RangeError);
  });
});

describe("validateFile", () => {
  it("acepta una imagen dentro del límite", () => {
    expect(validateFile({ size: 2 * 1024 * 1024, type: "image/png" })).toBeNull();
  });

  it("acepta exactamente el límite", () => {
    expect(validateFile({ size: MAX_INPUT_BYTES, type: "image/jpeg" })).toBeNull();
  });

  it("rechaza más de 10 MB", () => {
    expect(validateFile({ size: MAX_INPUT_BYTES + 1, type: "image/jpeg" })).toBe("too-large");
  });

  it("rechaza un archivo que no es imagen", () => {
    expect(validateFile({ size: 1000, type: "application/pdf" })).toBe("not-an-image");
  });

  it("tolera el type vacío que devuelven algunos Android", () => {
    expect(validateFile({ size: 1000, type: "" })).toBeNull();
  });
});
