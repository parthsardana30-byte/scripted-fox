import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const sourcePath = "D:/codex/ScriptWriter/template-source.pptx";
const buildDir = "D:/codex/ScriptWriter/.ppt-build";
const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));

const snapshot = await presentation.inspect({
  kind: "deck,slide,textbox,shape,image,table,chart,notes,layout",
  include: "id,slide,name,title,text,textPreview,textChars,textLines,bbox,bboxUnit,alt,isPlaceholder,placeholders",
  maxChars: 100000,
});
await fs.writeFile(path.join(buildDir, "template-inspect.ndjson"), snapshot.ndjson, "utf8");

const montage = await presentation.export({ format: "png", montage: true, scale: 0.7 });
await fs.writeFile(path.join(buildDir, "template-montage.png"), new Uint8Array(await montage.arrayBuffer()));

const slideDir = path.join(buildDir, "source-slides");
await fs.mkdir(slideDir, { recursive: true });
for (let i = 0; i < presentation.slides.count; i += 1) {
  const slide = presentation.slides.getItem(i);
  const png = await slide.export({ format: "png", scale: 1.2 });
  await fs.writeFile(path.join(slideDir, `slide-${String(i + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(slideDir, `slide-${String(i + 1).padStart(2, "0")}.layout.json`), await layout.text(), "utf8");
}

console.log(JSON.stringify({
  slides: presentation.slides.count,
  masters: presentation.masters.items.map((m) => ({ id: m.id, name: m.name })),
  layouts: presentation.layouts.items.map((l) => ({ id: l.id, name: l.name, placeholders: l.placeholders.summary() })),
}, null, 2));
