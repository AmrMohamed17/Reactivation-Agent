/**
 * Posts an internal notification to a Slack incoming webhook.
 *
 * Returns whether it succeeded rather than throwing. A send that reached the
 * customer must not be reported as failed because an internal ping did not
 * land, so callers treat this as best-effort.
 */
export async function notifySlack(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
