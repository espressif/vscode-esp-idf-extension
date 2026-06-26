export function exceptionFingerprint(
  error: unknown,
  properties?: { [key: string]: string }
): string {
  const err = error as Error | null | undefined;
  return [
    err?.name || "Error",
    err?.message ?? String(error ?? ""),
    properties?.category ?? "",
    properties?.command ?? "",
  ].join("\0");
}
