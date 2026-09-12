import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const pptx = "D:/codex/ScriptWriter/output/Aryan_Personal_Branding_Presentation_Final.pptx";
const out = "D:/codex/ScriptWriter/.ppt-build/final-render";
await fs.mkdir(out, { recursive: true });
const presentation = await PresentationFile.importPptx(await FileBlob.load(pptx));

const montage = await presentation.export({ format: "png", montage: true, scale: 0.8 });
await fs.writeFile(path.join(out, "montage.png"), new Uint8Array(await montage.arrayBuffer()));
const inspection = await presentation.inspect({
  kind: "slide,textbox,shape,image,notes",
  include: "id,slide,name,title,text,textPreview,bbox,bboxUnit",
  maxChars: 100000,
});
await fs.writeFile(path.join(out, "inspect.ndjson"), inspection.ndjson, "utf8");

for (let i = 0; i < presentation.slides.count; i += 1) {
  const slide = presentation.slides.getItem(i);
  const png = await slide.export({ format: "png", scale: 1.2 });
  await fs.writeFile(path.join(out, `slide-${i + 1}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(out, `slide-${i + 1}.layout.json`), await layout.text(), "utf8");
}
console.log(JSON.stringify({ slides: presentation.slides.count, out }, null, 2));
