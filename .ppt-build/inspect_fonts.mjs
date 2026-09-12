import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const p = await PresentationFile.importPptx(await FileBlob.load("D:/codex/ScriptWriter/template-source.pptx"));
for (const [slideNo, names] of [[1,["TextBox 44","TextBox 45","TextBox 46"]],[4,["TextBox 6","TextBox 11","TextBox 14"]]]) {
  const slide = p.slides.getItem(slideNo-1);
  for (const name of names) {
    const s=slide.shapes.items.find(x=>x.name===name);
    console.log(slideNo,name,JSON.stringify({textStyle:s?.textStyle,style:s?.text?.style,paragraphs:s?.paragraphs?.items?.map(p=>({font:p.font,style:p.style}))},null,2));
  }
}
