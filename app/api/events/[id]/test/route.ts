import { getStaffUser } from "@/lib/auth";
import { EmailNotConfiguredError, isEmailConfigured } from "@/lib/email";
import { sendTestEmail } from "@/lib/invitations";

type Context = { params: Promise<{ id: string }> };

/**
 * Sends one preview to the signed-in staff member.
 *
 * The destination is taken from the verified Access identity, never from the
 * request body, so this endpoint cannot be used to send mail to an arbitrary
 * address.
 */
export async function POST(_request: Request, { params }: Context) {
  const user = await getStaffUser();
  if (!user) return Response.json({ error: "Not authorised" }, { status: 403 });

  if (!isEmailConfigured()) {
    return Response.json(
      {
        error:
          "Email sending is not set up yet. Add the RESEND_API_KEY and INVITE_FROM_EMAIL secrets, then try again.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;

  try {
    const result = await sendTestEmail(id, user.email);
    if (!result.ok) return Response.json({ error: result.error }, { status: 502 });
    return Response.json({ sentTo: user.email });
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Sending failed" },
      { status: 500 },
    );
  }
}
