const defaultRedirect = "/dashboard";

export function safeInternalRedirect(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return defaultRedirect;
  }

  try {
    const parsed = new URL(value, "http://internal.local");
    if (parsed.origin !== "http://internal.local") return defaultRedirect;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultRedirect;
  }
}
