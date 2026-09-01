import { Resend } from "resend";

export type EmailResult = {
  providerMessageId: string;
  /** Where it actually landed. Differs from the lead's address in demo mode. */
  deliveredTo: string;
  redirected: boolean;
};

/**
 * Sends a single approved message.
 *
 * Demo mode: the seeded leads have synthetic addresses that would bounce, so
 * every send is redirected to DEMO_REDIRECT_EMAIL. The lead's true address is
 * still what the queue displays and what gets recorded — only delivery moves.
 * In production this redirect is absent and the lead is mailed directly.
 */
export async function sendLeadEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");
  if (!from) throw new Error("RESEND_FROM is not set.");

  const redirectTo = process.env.DEMO_REDIRECT_EMAIL?.trim();
  const redirected = Boolean(redirectTo) && redirectTo !== to;
  const deliveredTo = redirected ? redirectTo! : to;

  // The approved text is sent verbatim. A footer is appended only when the
  // message has been diverted, so it is obvious in the demo inbox which lead
  // each email was actually for.
  const text = redirected
    ? `${body}\n\n---\n[demo] Addressed to ${to}, redirected to ${deliveredTo}.`
    : body;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [deliveredTo],
    subject,
    text,
  });

  // The Resend SDK reports failures in the tuple rather than throwing.
  if (error) throw new Error(`${error.name}: ${error.message}`);
  if (!data?.id) throw new Error("Resend accepted the request but returned no id.");

  return { providerMessageId: data.id, deliveredTo, redirected };
}
