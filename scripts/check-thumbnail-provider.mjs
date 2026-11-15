// Read-only model check by default. --generate makes one billable test request.
// Never prints keys, prompts containing user data, or provider error bodies.
import env from "@next/env";
env.loadEnvConfig(process.cwd(), true);
const key = process.env.THUMBNAIL_API_KEY || process.env.GEMINI_API_KEY;
if (!key) throw new Error("Configure THUMBNAIL_API_KEY or GEMINI_API_KEY on the server.");
const model = process.env.THUMBNAIL_MODEL || "gemini-2.5-flash-image";
const generate = process.argv.includes("--generate");
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}${generate ? ":generateContent" : ""}`, {
  method: generate ? "POST" : "GET",
  headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
  ...(generate ? { body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: "Create a simple landscape 16:9 illustration of a red paper airplane on a plain light background. No text. This is an integration test." }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "16:9" } },
  }) } : {}),
  signal: AbortSignal.timeout(90000),
});
const data = await response.json();
const image = data.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData;
console.log(JSON.stringify({ model, httpStatus: response.status, ...(generate ? {
  imageReturned: Boolean(image), mimeType: image?.mimeType, bytes: image ? Buffer.byteLength(image.data, "base64") : 0,
} : { available: response.ok }), errorStatus: data.error?.status }));
if (!response.ok || (generate && !image)) process.exitCode = 1;
