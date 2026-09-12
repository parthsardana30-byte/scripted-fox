import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { createScriptPdf } from "@/lib/export/script-pdf";

async function assets() {
  const fromPublic = (file: string) => readFile(path.join(process.cwd(), "public", file));
  const [courierRegular, courierBold, devanagari, typewriterImage] = await Promise.all([
    fromPublic("fonts/CourierPrime-Regular.ttf"),
    fromPublic("fonts/CourierPrime-Bold.ttf"),
    fromPublic("fonts/NotoSansDevanagari.ttf"),
    fromPublic("typewriter-ascii-wide.png"),
  ]);
  return { courierRegular, courierBold, devanagari, typewriterImage };
}

describe("professional script PDF", () => {
  it("builds a paginated, branded PDF with multilingual script content", async () => {
    const repeatedParagraph = "This opening establishes the promise, builds tension, and gives the viewer a clear reason to keep watching. ".repeat(36);
    const bytes = await createScriptPdf({
      title: "The Story Behind a Better Creative Workflow",
      author: "Aryan Atharv",
      generatedAt: new Date("2026-09-12T12:00:00.000Z"),
      sections: [
        { label: "Cold open", body: repeatedParagraph },
        { label: "Hindi beat", body: "यह हिस्सा दर्शक को अगला विचार साफ़ तरीके से समझाता है।" },
        { label: "Closing", body: "End with one specific action the audience can take today." },
      ],
      ...await assets(),
    });
    const pdf = await PDFDocument.load(bytes);

    expect(bytes.byteLength).toBeGreaterThan(100_000);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(pdf.getTitle()).toBe("The Story Behind a Better Creative Workflow");
    expect(pdf.getAuthor()).toBe("Aryan Atharv");
    expect(pdf.getCreator()).toBe("Scripted Fox");
  }, 30_000);
});
