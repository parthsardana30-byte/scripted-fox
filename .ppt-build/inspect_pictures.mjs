import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const p = await PresentationFile.importPptx(await FileBlob.load("D:/codex/ScriptWriter/template-source.pptx"));
for (const slideNo of [1, 3, 4, 5, 6, 12]) {
  const slide = p.slides.getItem(slideNo - 1);
  console.log(`--- slide ${slideNo} ---`);
  for (let i = 0; i < slide.shapes.items.length; i += 1) {
    const shape = slide.shapes.items[i];
    let picture = null;
    try { picture = shape.getPictureFillBitmap(); } catch {}
    if (picture) console.log(JSON.stringify({ index: i, id: shape.id, name: shape.name, frame: shape.frame, picture: true }));
  }
}
