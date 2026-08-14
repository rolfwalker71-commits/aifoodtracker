/**
 * Read process.env at request/runtime time.
 * Static `process.env.FOO` is inlined during `next build`, so Docker images
 * built in CI would otherwise keep empty VAPID keys forever.
 */
export function runtimeEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) return "";
  return raw.trim().replace(/^["']|["']$/g, "");
}
