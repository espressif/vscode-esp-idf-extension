export function exceptionFingerprint(
  error: Error,
  properties?: { [key: string]: string }
): string {
  return [
    error.name || "Error",
    error.message,
    properties?.category ?? "",
    properties?.command ?? "",
  ].join("\0");
}
