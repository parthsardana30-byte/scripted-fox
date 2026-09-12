import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const p = await PresentationFile.importPptx(await FileBlob.load("D:/codex/ScriptWriter/template-source.pptx"));
const slides = p.slides;
const slide = p.slides.getItem(0);
const shape = slide.shapes.items?.[0];
for (const [label, value] of [["slides", slides], ["slide", slide], ["shapes", slide.shapes], ["shape", shape]]) {
  const methods = new Set();
  let current = value;
  while (current && current !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(current)) methods.add(key);
    current = Object.getPrototypeOf(current);
  }
  console.log(label, [...methods].sort());
}
