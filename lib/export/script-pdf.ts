import "regenerator-runtime/runtime.js";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from "pdf-lib";

export type ScriptPdfSection = { label: string; body: string };
export type ScriptPdfInput = {
  title: string;
  author?: string;
  sections: ScriptPdfSection[];
  generatedAt?: Date;
  courierRegular: Uint8Array;
  courierBold: Uint8Array;
  devanagari: Uint8Array;
  typewriterImage: Uint8Array;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 58;
const BODY_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const PAPER = rgb(0.975, 0.958, 0.925);
const PAPER_EDGE = rgb(0.82, 0.78, 0.7);
const INK = rgb(0.105, 0.105, 0.115);
const MUTED_INK = rgb(0.36, 0.35, 0.34);
const ACCENT = rgb(0.94, 0.12, 0.24);
const DARK = rgb(0.055, 0.06, 0.075);
const DEVANAGARI = /[\u0900-\u097f]/;

type Fonts = { regular: PDFFont; bold: PDFFont; devanagari: PDFFont };

function cleanText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").trim();
}

function fontFor(text: string, fonts: Fonts, bold = false) {
  if (DEVANAGARI.test(text)) return fonts.devanagari;
  return bold ? fonts.bold : fonts.regular;
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const rawParagraph of text.split("\n")) {
    const paragraph = rawParagraph.trim();
    if (!paragraph) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= width) {
        line = word;
        continue;
      }
      let fragment = "";
      for (const character of [...word]) {
        const next = fragment + character;
        if (fragment && font.widthOfTextAtSize(next, size) > width) {
          lines.push(fragment);
          fragment = character;
        } else {
          fragment = next;
        }
      }
      line = fragment;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawPaper(page: PDFPage, pageNumber?: number) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: PAPER });
  page.drawLine({ start: { x: 34, y: 28 }, end: { x: 34, y: PAGE_HEIGHT - 28 }, thickness: 0.55, color: PAPER_EDGE, opacity: 0.45 });
  page.drawLine({ start: { x: PAGE_WIDTH - 34, y: 28 }, end: { x: PAGE_WIDTH - 34, y: PAGE_HEIGHT - 28 }, thickness: 0.55, color: PAPER_EDGE, opacity: 0.45 });
  for (let index = 0; index < 16; index += 1) {
    const x = 24 + ((index * 83 + (pageNumber ?? 1) * 17) % 548);
    const y = 34 + ((index * 127 + (pageNumber ?? 1) * 29) % 768);
    page.drawCircle({ x, y, size: index % 3 === 0 ? 0.75 : 0.45, color: MUTED_INK, opacity: 0.08 });
  }
}

function drawFoxMark(page: PDFPage, x: number, y: number, scale = 1) {
  page.drawRectangle({ x, y, width: 28 * scale, height: 28 * scale, color: DARK, borderColor: ACCENT, borderWidth: 0.7 * scale });
  page.drawSvgPath("M3 7 L8 1 L12 8 L16 1 L25 7 L22 20 L14 26 L6 20 Z", { x: x + 1.5 * scale, y: y + 27.5 * scale, scale, color: ACCENT });
  page.drawSvgPath("M6 11 C10 11 12 14 14 18 C16 14 18 11 22 11 L20 19 L14 24 L8 19 Z", { x: x + 1.5 * scale, y: y + 27.5 * scale, scale, color: PAPER });
  page.drawCircle({ x: x + 11.5 * scale, y: y + 13 * scale, size: 1.1 * scale, color: DARK });
  page.drawCircle({ x: x + 18 * scale, y: y + 13 * scale, size: 1.1 * scale, color: DARK });
}

function drawBrandHeader(page: PDFPage, fonts: Fonts, pageNumber?: number) {
  drawFoxMark(page, MARGIN_X, PAGE_HEIGHT - 67, 1);
  page.drawText("SCRIPTED", { x: MARGIN_X + 37, y: PAGE_HEIGHT - 49, font: fonts.bold, size: 10.5, color: INK });
  page.drawText("FOX", { x: MARGIN_X + 90, y: PAGE_HEIGHT - 49, font: fonts.bold, size: 10.5, color: ACCENT });
  page.drawText(pageNumber ? `SCRIPT / ${String(pageNumber).padStart(2, "0")}` : "TYPEWRITTEN SCRIPT EXPORT", {
    x: PAGE_WIDTH - MARGIN_X - (pageNumber ? 65 : 146), y: PAGE_HEIGHT - 49, font: fonts.regular, size: 7.5, color: MUTED_INK,
  });
  page.drawLine({ start: { x: MARGIN_X, y: PAGE_HEIGHT - 76 }, end: { x: PAGE_WIDTH - MARGIN_X, y: PAGE_HEIGHT - 76 }, thickness: 0.8, color: INK, opacity: 0.28 });
}

function drawPageNumber(page: PDFPage, fonts: Fonts, pageNumber: number, totalPages: number) {
  const label = `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`;
  page.drawText(label, { x: PAGE_WIDTH - MARGIN_X - fonts.regular.widthOfTextAtSize(label, 7.5), y: 31, font: fonts.regular, size: 7.5, color: MUTED_INK });
  page.drawText("SCRIPTED FOX - READY TO RECORD", { x: MARGIN_X, y: 31, font: fonts.regular, size: 7.5, color: MUTED_INK });
}

function fitImage(image: PDFImage, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

export async function createScriptPdf(input: ScriptPdfInput) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regular, bold, devanagari, typewriter] = await Promise.all([
    pdf.embedFont(Uint8Array.from(input.courierRegular), { subset: true }),
    pdf.embedFont(Uint8Array.from(input.courierBold), { subset: true }),
    pdf.embedFont(Uint8Array.from(input.devanagari), { subset: true }),
    pdf.embedPng(Uint8Array.from(input.typewriterImage)),
  ]);
  const fonts = { regular, bold, devanagari };
  const title = cleanText(input.title) || "Untitled Script";
  const author = cleanText(input.author || "") || "Scripted Fox Creator";
  const generatedAt = input.generatedAt ?? new Date();
  const cleanedSections = input.sections.map((section) => ({ label: cleanText(section.label), body: cleanText(section.body) })).filter((section) => section.body);
  const wordCount = cleanedSections.reduce((sum, section) => sum + section.body.split(/\s+/).filter(Boolean).length, 0);

  pdf.setTitle(title);
  pdf.setAuthor(author);
  pdf.setCreator("Scripted Fox");
  pdf.setProducer("Scripted Fox professional script export");
  pdf.setSubject("YouTube production script");
  pdf.setKeywords(["Scripted Fox", "script", "YouTube", "typewriter"]);
  pdf.setCreationDate(generatedAt);

  const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPaper(cover);
  drawBrandHeader(cover, fonts);
  cover.drawRectangle({ x: MARGIN_X, y: 168, width: 4, height: 454, color: ACCENT });
  cover.drawText("ORIGINAL CREATOR SCRIPT", { x: MARGIN_X + 24, y: 601, font: fonts.bold, size: 9, color: ACCENT });
  let coverY = 557;
  const coverFont = fontFor(title, fonts, true);
  const coverTitleLines = wrapText(title, coverFont, DEVANAGARI.test(title) ? 29 : 34, BODY_WIDTH - 48).slice(0, 6);
  for (const line of coverTitleLines) {
    cover.drawText(line, { x: MARGIN_X + 24, y: coverY, font: coverFont, size: DEVANAGARI.test(line) ? 29 : 34, color: INK });
    coverY -= 43;
  }
  cover.drawLine({ start: { x: MARGIN_X + 24, y: coverY - 7 }, end: { x: MARGIN_X + 168, y: coverY - 7 }, thickness: 2.1, color: ACCENT });
  coverY -= 50;
  const authorFont = fontFor(author, fonts);
  cover.drawText("WRITTEN BY", { x: MARGIN_X + 24, y: coverY, font: fonts.bold, size: 8, color: MUTED_INK });
  cover.drawText(author, { x: MARGIN_X + 24, y: coverY - 24, font: authorFont, size: 13, color: INK });
  cover.drawText(`${wordCount.toLocaleString("en-US")} WORDS`, { x: MARGIN_X + 24, y: 210, font: fonts.bold, size: 8, color: MUTED_INK });
  cover.drawText(`${Math.max(1, Math.ceil(wordCount / 150))} MIN EST. READ`, { x: MARGIN_X + 144, y: 210, font: fonts.bold, size: 8, color: MUTED_INK });
  cover.drawText(generatedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(), { x: MARGIN_X + 292, y: 210, font: fonts.bold, size: 8, color: MUTED_INK });
  cover.drawText("A working script exported from Scripted Fox", { x: MARGIN_X + 24, y: 177, font: fonts.regular, size: 9, color: MUTED_INK });

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let scriptPageNumber = 1;
  drawPaper(page, scriptPageNumber);
  drawBrandHeader(page, fonts, scriptPageNumber);
  let y = PAGE_HEIGHT - 112;
  const newScriptPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    scriptPageNumber += 1;
    drawPaper(page, scriptPageNumber);
    drawBrandHeader(page, fonts, scriptPageNumber);
    y = PAGE_HEIGHT - 112;
  };

  for (const section of cleanedSections) {
    if (y < 125) newScriptPage();
    const sectionFont = fontFor(section.label, fonts, true);
    page.drawText(section.label.toUpperCase(), { x: MARGIN_X, y, font: sectionFont, size: 9.2, color: ACCENT });
    y -= 22;
    for (const paragraph of section.body.split(/\n{2,}/)) {
      const paragraphFont = fontFor(paragraph, fonts);
      const fontSize = DEVANAGARI.test(paragraph) ? 10.2 : 10.6;
      const lineHeight = DEVANAGARI.test(paragraph) ? 16.8 : 16;
      for (const line of wrapText(paragraph, paragraphFont, fontSize, BODY_WIDTH)) {
        if (y < 72) newScriptPage();
        if (line) page.drawText(line, { x: MARGIN_X, y, font: paragraphFont, size: fontSize, color: INK, opacity: 0.94 });
        y -= line ? lineHeight : lineHeight * 0.65;
      }
      y -= 8;
    }
    y -= 12;
  }

  const typewriterSize = fitImage(typewriter, PAGE_WIDTH - 28, 320);
  const typewriterTop = 36 + typewriterSize.height;
  if (y < typewriterTop + 70) newScriptPage();
  page.drawText("END OF SCRIPT", { x: MARGIN_X, y: typewriterTop + 30, font: fonts.bold, size: 10, color: ACCENT });
  page.drawLine({ start: { x: MARGIN_X + 92, y: typewriterTop + 33 }, end: { x: PAGE_WIDTH - MARGIN_X, y: typewriterTop + 33 }, thickness: 0.8, color: INK, opacity: 0.24 });
  page.drawImage(typewriter, { x: (PAGE_WIDTH - typewriterSize.width) / 2, y: 36, width: typewriterSize.width, height: typewriterSize.height });

  const pages = pdf.getPages();
  pages.slice(1).forEach((scriptPage, index) => drawPageNumber(scriptPage, fonts, index + 1, pages.length - 1));
  return pdf.save();
}
