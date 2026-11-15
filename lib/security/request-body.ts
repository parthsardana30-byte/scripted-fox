export class RequestBodyError extends Error {
  constructor(message: string, public readonly status: 400 | 413) {
    super(message);
    this.name = "RequestBodyError";
  }
}

// Count actual streamed bytes; Content-Length is optional and cannot be trusted.
export async function readJsonBody(request: Request, maximumBytes: number): Promise<unknown> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) throw new RangeError("Invalid body limit");
  if (Number(request.headers.get("content-length")) > maximumBytes) {
    throw new RequestBodyError("This request is too large.", 413);
  }
  if (!request.body) throw new RequestBodyError("The request body must be valid JSON.", 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyError("This request is too large.", 413);
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return JSON.parse(parts.join("")) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError("The request body must be valid JSON.", 400);
  } finally {
    reader.releaseLock();
  }
}
