import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { convertWordToPdfDataUrl } = require("../utils/certificate-converter");

describe("certificate converter helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts DOCX content returned by converter into a PDF data URL", async () => {
    const pdfBytes = Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 55]); // %PDF-1.7

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
        },
      }),
    );

    const result = await convertWordToPdfDataUrl({
      fileName: "certificate.docx",
      content:
        "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBAoAAAAAA",
    });

    expect(result).toMatch(/^data:application\/pdf;base64,/);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces converter JSON errors without reading response body twice", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "conversion failed" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await expect(
      convertWordToPdfDataUrl({
        fileName: "certificate.docx",
        content:
          "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBAoAAAAAA",
      }),
    ).rejects.toThrow("conversion failed");

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
