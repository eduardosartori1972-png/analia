import { describe, expect, it } from "vitest";

import { sniffImageType } from "@/lib/analysis/image-guard";

const pad = (bytes: number[], length = 16) =>
  new Uint8Array([...bytes, ...new Array<number>(Math.max(0, length - bytes.length)).fill(0)]);

describe("sniffImageType", () => {
  it("reconoce un JPEG", () => {
    expect(sniffImageType(pad([0xff, 0xd8, 0xff]))).toBe("image/jpeg");
  });

  it("reconoce un PNG", () => {
    expect(sniffImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
  });

  it("reconoce un WebP", () => {
    const bytes = new Uint8Array(16);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    bytes.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
    expect(sniffImageType(bytes)).toBe("image/webp");
  });

  it("reconoce un HEIC", () => {
    const bytes = new Uint8Array(16);
    bytes.set([0x00, 0x00, 0x00, 0x18], 0);
    bytes.set([0x66, 0x74, 0x79, 0x70], 4); // ftyp
    bytes.set([0x68, 0x65, 0x69, 0x63], 8); // heic
    expect(sniffImageType(bytes)).toBe("image/heic");
  });

  it("rechaza un archivo de texto", () => {
    expect(sniffImageType(new TextEncoder().encode('<?xml version="1.0"?>'))).toBeNull();
  });

  it("rechaza un archivo demasiado corto", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it("no confía en la extensión: un zip no pasa", () => {
    expect(sniffImageType(pad([0x50, 0x4b, 0x03, 0x04]))).toBeNull();
  });
});
