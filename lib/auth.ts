export const AUTH_COOKIE = "gsp_auth";

/**
 * Derives the cookie value from the passcode so the raw secret never sits in a
 * cookie. Uses Web Crypto so the same function runs in both the Edge middleware
 * and the Node route handler.
 */
export async function passcodeToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`greenscape:${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
