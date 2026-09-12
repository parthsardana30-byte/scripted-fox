import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "D:/codex/ScriptWriter";
const sourcePath = path.join(workspaceDir, "template-source.pptx");
const buildDir = path.join(workspaceDir, ".ppt-build");
const finalPath = path.join(workspaceDir, "output", "Aryan_Personal_Branding_Presentation_Final.pptx");
const skillDir = "C:/Users/Aryan/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations";
const runtimePython = "C:/Users/Aryan/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";

const BLACK = "#111111";
const WHITE = "#FFFFFF";
const RED = "#F04438";
const FONT = "Poppins";
const FONT_BOLD = "Poppins Bold";

const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));

function shapeByName(slide, name) {
  const shape = slide.shapes.items.find((item) => item.name === name);
  if (!shape) throw new Error(`Missing shape ${name} on slide ${slide.index + 1}`);
  return shape;
}

function tryDelete(slide, names) {
  for (const name of names) {
    const shape = slide.shapes.items.find((item) => item.name === name);
    if (shape) shape.delete();
  }
}

function styleText(shape, {
  fontSize,
  color = BLACK,
  bold = false,
  typeface = bold ? FONT_BOLD : FONT,
  align = "left",
} = {}) {
  shape.text.style = {
    typeface,
    fontSize,
    color,
    bold,
    alignment: align,
    autoFit: "none",
  };
}

function setText(slide, name, text, style = {}) {
  const shape = shapeByName(slide, name);
  shape.text = text;
  styleText(shape, style);
  return shape;
}

function addText(slide, name, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = text;
  styleText(shape, style);
  return shape;
}

function cleanHeaderFooter(slide, brandName, extras = []) {
  const brand = slide.shapes.items.find((item) => item.name.match(/^TextBox (46|61|62|40|41|43)$/));
  if (brand?.text) {
    brand.text = brandName;
    styleText(brand, { fontSize: 22, bold: true });
  }
  tryDelete(slide, [
    "TextBox 47", "TextBox 48", "TextBox 49",
    "TextBox 63", "TextBox 64", "TextBox 65",
    "TextBox 42", "TextBox 43", "TextBox 44",
    "TextBox 62", "TextBox 63", "TextBox 64",
    "TextBox 41", "TextBox 42", "TextBox 43",
    "TextBox 44", "TextBox 45", "TextBox 46",
    "TextBox 40", "TextBox 32", "TextBox 33", "TextBox 35", "TextBox 36", "TextBox 53", "TextBox 56", "TextBox 59",
    "Freeform 5", "Freeform 39", "Freeform 40", "Freeform 42", "Freeform 55", "Freeform 58", "Freeform 60", "Freeform 61",
    "Freeform 31", "Freeform 32", "Freeform 34", "Freeform 35", "Freeform 37", "Freeform 38",
    ...extras,
  ]);
}

function setNotes(slide, text) {
  slide.speakerNotes.textFrame.setText(text);
  slide.speakerNotes.setVisible(true);
}

// Slide 1 — identity and hook.
{
  const slide = presentation.slides.getItem(0);
  setText(slide, "TextBox 8", "Hi, I'm", { fontSize: 64, bold: false });
  const name = setText(slide, "TextBox 44", "Aryan", { fontSize: 145, bold: true });
  name.position = { left: 85, top: 250, width: 900, height: 250 };
  const role = setText(slide, "TextBox 45", "ASPIRING PRODUCT BUILDER", { fontSize: 31, bold: true });
  role.position = { left: 88, top: 535, width: 760, height: 60 };
  tryDelete(slide, [
    "Freeform 10", "Freeform 12", "TextBox 13",
    "Freeform 15", "TextBox 16", "Freeform 18", "TextBox 19",
    "Freeform 21", "TextBox 22", "Freeform 24", "TextBox 25",
    "Freeform 27", "TextBox 28", "Freeform 30", "TextBox 31",
    "Freeform 35", "Freeform 37", "TextBox 40", "Freeform 42", "TextBox 43",
    "TextBox 47", "TextBox 48", "TextBox 49", "Freeform 5",
  ]);
  const portrait = shapeByName(slide, "Freeform 33");
  portrait.fill = BLACK;
  addText(slide, "Brand Hook Idea", "IDEA", { left: 1180, top: 320, width: 560, height: 110 }, { fontSize: 80, color: WHITE, bold: true, align: "center" });
  addText(slide, "Brand Hook To", "TO", { left: 1180, top: 445, width: 560, height: 90 }, { fontSize: 54, color: WHITE, bold: false, align: "center" });
  addText(slide, "Brand Hook Product", "PRODUCT", { left: 1135, top: 550, width: 650, height: 120 }, { fontSize: 80, color: RED, bold: true, align: "center" });
  addText(slide, "Brand Tagline", "I turn rough ideas into useful digital tools.", { left: 88, top: 660, width: 850, height: 120 }, { fontSize: 34, color: BLACK, bold: false });
  setText(slide, "TextBox 46", "ARYAN", { fontSize: 22, bold: true });
  setNotes(slide, "Good morning. I am Aryan. I am interested in building digital products. I enjoy taking a rough idea and turning it into something useful. I chose the words ‘idea to product’ because they describe how I like to work. In this presentation, I will explain the kind of problems I enjoy, how I work, the skills I am building, and one project that shows my direction.");
}

// Slide 2 — thinking style and desired role.
{
  const slide = presentation.slides.getItem(2);
  setText(slide, "TextBox 6", "The kind of\nwork I enjoy", { fontSize: 74, bold: true });
  setText(slide, "TextBox 13", "A rough idea", { fontSize: 31, bold: true });
  setText(slide, "TextBox 16", "I like finding the real problem behind an idea.", { fontSize: 27, bold: false });
  setText(slide, "TextBox 21", "A useful answer", { fontSize: 31, bold: true });
  setText(slide, "TextBox 24", "I break the work into small steps, build, and improve.", { fontSize: 27, bold: false });
  setText(slide, "TextBox 29", "Product thinking", { fontSize: 26, bold: true });
  setText(slide, "TextBox 32", "What I practise", { fontSize: 21, bold: false });
  setText(slide, "TextBox 35", "Web development", { fontSize: 26, bold: true });
  setText(slide, "TextBox 38", "What I build", { fontSize: 21, bold: false });
  tryDelete(slide, [
    "Freeform 8", "Freeform 40", "Freeform 42", "TextBox 43",
    "Freeform 45", "Freeform 47", "TextBox 48",
    "Freeform 50", "Freeform 52", "TextBox 53",
    "TextBox 56", "Freeform 55", "Freeform 58", "TextBox 59",
    "Freeform 61", "TextBox 63", "TextBox 64", "TextBox 65",
  ]);
  const iconSvg = await fs.readFile(path.join(workspaceDir, "app", "icon.svg"));
  const iconPng = await sharp(iconSvg).resize(760, 760).png().toBuffer();
  slide.images.add({
    blob: new Uint8Array(iconPng),
    contentType: "image/png",
    fit: "contain",
    position: { left: 175, top: 420, width: 590, height: 430 },
  });
  addText(slide, "Thinking Caption", "I enjoy work that starts unclear\nand ends useful.", { left: 120, top: 855, width: 700, height: 90 }, { fontSize: 27, color: BLACK, bold: true, align: "center" });
  setText(slide, "TextBox 62", "ARYAN", { fontSize: 22, bold: true });
  setNotes(slide, "I enjoy work that does not have a clear answer at the start. First, I try to understand the real problem. Then I divide the work into smaller steps. I build a simple version, see what works, and improve it. This is why product thinking and web development interest me. They allow me to move from an idea to something a person can actually use.");
}

// Slide 3 — character.
{
  const slide = presentation.slides.getItem(3);
  setText(slide, "TextBox 6", "How I\nwork", { fontSize: 76, bold: true });
  setText(slide, "TextBox 11", "Curiosity", { fontSize: 31, bold: true });
  setText(slide, "TextBox 14", "I ask why before I choose a solution.", { fontSize: 24, bold: false });
  setText(slide, "TextBox 19", "Clarity", { fontSize: 31, bold: true });
  setText(slide, "TextBox 22", "I explain ideas in simple words.", { fontSize: 24, bold: false });
  styleText(shapeByName(slide, "TextBox 19"), { fontSize: 31, color: WHITE, bold: true });
  styleText(shapeByName(slide, "TextBox 22"), { fontSize: 24, color: WHITE, bold: false });
  setText(slide, "TextBox 27", "Ownership", { fontSize: 31, bold: true });
  setText(slide, "TextBox 30", "I stay with the task until the result works.", { fontSize: 24, bold: false });
  tryDelete(slide, ["TextBox 33", "Freeform 32", "TextBox 36", "Freeform 35", "Freeform 40", "TextBox 42", "TextBox 43", "TextBox 44"]);
  setText(slide, "TextBox 41", "ARYAN", { fontSize: 22, bold: true });
  setNotes(slide, "Three behaviours guide my work. The first is curiosity. I ask why before choosing a solution. The second is clarity. I try to explain ideas in simple words so the team can move together. The third is ownership. When I accept a task, I stay with it until the result works. These behaviours are the character I want people to connect with my name.");
}

// Slide 4 — competence.
{
  const slide = presentation.slides.getItem(4);
  setText(slide, "TextBox 4", "What I\ncan bring", { fontSize: 76, bold: true });
  tryDelete(slide, ["Freeform 6", "TextBox 7"]);
  setText(slide, "TextBox 12", "Think before building", { fontSize: 31, bold: true });
  setText(slide, "TextBox 15", "I connect user needs with practical features.", { fontSize: 25, bold: false });
  setText(slide, "TextBox 20", "Build and improve", { fontSize: 31, bold: true });
  setText(slide, "TextBox 23", "I turn an idea into a working product, then improve it with feedback.", { fontSize: 25, bold: false });
  shapeByName(slide, "Freeform 25").delete();
  const youtubeIcon = await fs.readFile(path.join(workspaceDir, "public", "youtube-glass-channel.png"));
  slide.images.add({
    blob: new Uint8Array(youtubeIcon),
    contentType: "image/png",
    fit: "contain",
    position: { left: 1110, top: 125, width: 650, height: 470 },
  });
  setText(slide, "TextBox 30", "Product thinking", { fontSize: 23, bold: true, align: "center" });
  styleText(shapeByName(slide, "TextBox 30"), { fontSize: 23, color: WHITE, bold: true, align: "center" });
  setText(slide, "TextBox 35", "Web development", { fontSize: 23, bold: true, align: "center" });
  setText(slide, "TextBox 40", "User research", { fontSize: 23, bold: true, align: "center" });
  setText(slide, "TextBox 45", "AI tools", { fontSize: 23, bold: true, align: "center" });
  setText(slide, "TextBox 50", "Testing", { fontSize: 23, bold: true, align: "center" });
  tryDelete(slide, ["TextBox 53", "Freeform 52", "TextBox 56", "Freeform 55", "Freeform 60", "TextBox 62", "TextBox 63", "TextBox 64"]);
  setText(slide, "TextBox 61", "ARYAN", { fontSize: 22, bold: true });
  setNotes(slide, "My main strength is the combination of thinking and building. I try to understand what the user needs before deciding what to create. I can then turn the idea into a working web product. Research and testing help me improve the result. I also use AI tools as support, while keeping the final decisions clear and human. This combination helps me contribute from the early idea stage to the working solution.");
}

// Slide 5 — proof through a real project.
{
  const slide = presentation.slides.getItem(5);
  setText(slide, "TextBox 6", "Proof: Scripted Fox", { fontSize: 67, bold: true });
  setText(slide, "TextBox 9", "A working product made for YouTube creators.", { fontSize: 30, bold: false });
  const problem = setText(slide, "TextBox 12", "PROBLEM", { fontSize: 42, color: RED, bold: true });
  problem.position = { left: 86, top: 420, width: 430, height: 70 };
  const problemBody = setText(slide, "TextBox 15", "Creators have ideas but may struggle to shape a clear video.", { fontSize: 24, bold: false });
  problemBody.position = { left: 86, top: 505, width: 450, height: 145 };
  const approach = setText(slide, "TextBox 18", "APPROACH", { fontSize: 42, color: RED, bold: true });
  approach.position = { left: 585, top: 420, width: 450, height: 70 };
  const approachBody = setText(slide, "TextBox 21", "Make the path from idea to a ready script simple.", { fontSize: 24, bold: false });
  approachBody.position = { left: 585, top: 505, width: 450, height: 145 };
  const proof = setText(slide, "TextBox 26", "What this proves: I can connect user needs, design and technology.", { fontSize: 25, bold: true });
  proof.position = { left: 86, top: 755, width: 910, height: 80 };
  const lesson = setText(slide, "TextBox 29", "Building it taught me to stay close to the user.", { fontSize: 24, bold: false });
  lesson.position = { left: 86, top: 865, width: 910, height: 70 };
  shapeByName(slide, "Freeform 3").delete();
  const screenshot = await sharp(path.join(buildDir, "scripted-fox-home.png"))
    .extract({ left: 0, top: 0, width: 1440, height: 1600 })
    .png()
    .toBuffer();
  slide.images.add({
    blob: new Uint8Array(screenshot),
    contentType: "image/png",
    fit: "cover",
    position: { left: 1103, top: 118, width: 750, height: 871 },
  });
  tryDelete(slide, ["Freeform 23", "TextBox 32", "Freeform 31", "TextBox 35", "Freeform 34", "Freeform 39", "TextBox 41", "TextBox 42", "TextBox 43"]);
  setText(slide, "TextBox 40", "ARYAN", { fontSize: 22, bold: true });
  setNotes(slide, "Scripted Fox is evidence of this direction. It is a digital product for YouTube creators. Many creators have an idea but still struggle to shape it into a clear video. The product is designed to make the path from an idea to a ready script simpler. Working on it required product thinking, interface design and web development. It taught me that useful products begin with a clear user problem and improve through repeated testing.");
}

// Slide 6 — memorable brand promise.
{
  const slide = presentation.slides.getItem(11);
  setText(slide, "TextBox 8", "My brand\npromise", { fontSize: 88, bold: true });
  const statement = setText(slide, "TextBox 11", "I am Aryan, an aspiring product builder who turns unclear ideas into simple digital tools. My strength is staying curious and improving the work until it becomes useful.", { fontSize: 28, bold: false });
  statement.position = { left: 86, top: 590, width: 800, height: 170 };
  setText(slide, "TextBox 16", "CURIOUS", { fontSize: 24, bold: true, align: "center" });
  styleText(shapeByName(slide, "TextBox 16"), { fontSize: 24, color: WHITE, bold: true, align: "center" });
  setText(slide, "TextBox 21", "DEPENDABLE", { fontSize: 24, bold: true, align: "center" });
  const portrait = shapeByName(slide, "Freeform 5");
  portrait.fill = BLACK;
  addText(slide, "Monogram", "A", { left: 1300, top: 205, width: 460, height: 320 }, { fontSize: 190, color: WHITE, bold: true, align: "center" });
  setText(slide, "TextBox 24", "ARYAN", { fontSize: 34, bold: true });
  setText(slide, "TextBox 27", "Aspiring Product Builder", { fontSize: 24, bold: false });
  setText(slide, "TextBox 32", "github.com/aryanatharv", { fontSize: 22, bold: true });
  setText(slide, "TextBox 35", "Project: Scripted Fox", { fontSize: 22, bold: false });
  setText(slide, "TextBox 38", "Learning through building", { fontSize: 22, bold: false });
  tryDelete(slide, ["Freeform 42", "TextBox 44", "TextBox 45", "TextBox 46"]);
  setText(slide, "TextBox 43", "ARYAN", { fontSize: 22, bold: true });
  setNotes(slide, "The professional identity I am building is simple. I want people to see me as someone who can take an unclear idea and make it useful. I am still learning, so my brand is not based on claiming that I know everything. It is based on curiosity, steady improvement and taking responsibility for my work. My final brand statement is: I am Aryan, an aspiring product builder who turns unclear ideas into simple digital tools.");
}

// Keep the six strongest layouts: 1, 3, 4, 5, 6 and 12.
for (const index of [10, 9, 8, 7, 6, 1]) {
  presentation.slides.getItem(index).delete();
}

await fs.mkdir(path.dirname(finalPath), { recursive: true });
const stagingDir = path.join(workspaceDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate-personal-branding.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const { finalizePresentation } = await import(pathToFileURL(
  path.join(skillDir, "container_tools", "artifact_tool_utils.mjs"),
).href);
const referenceSha256 = createHash("sha256").update(await fs.readFile(sourcePath)).digest("hex");
const requirements = {
  explicitTotalSlideCount: 6,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  sourceTemplatePath: sourcePath,
};
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "18288000,10287000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: {
    basis: "reference",
    families: [FONT, FONT_BOLD],
    referencePath: sourcePath,
    referenceSha256,
  },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "Aryan_Personal_Branding_Presentation_Final.validation.json"),
});

await fs.writeFile(path.join(buildDir, "finalizer-result.json"), JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify({ finalPath, result }, null, 2));
