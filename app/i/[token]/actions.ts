"use server";

import { recordResponse, type GuestResponse } from "@/lib/invitations";

export type RsvpState = {
  status: "idle" | "saved" | "error";
  message: string;
  response: GuestResponse | null;
};

/**
 * Records a guest's RSVP.
 *
 * The token is the guest's credential, so it is read from the submitted form
 * rather than from any session. Everything else is validated here: a guest can
 * only ever write their own row, and only the fields below.
 */
export async function submitRsvp(
  _previous: RsvpState,
  formData: FormData,
): Promise<RsvpState> {
  const token = String(formData.get("token") ?? "");
  const rawResponse = String(formData.get("response") ?? "");

  if (rawResponse !== "going" && rawResponse !== "declined") {
    return { status: "error", message: "Please choose whether you can come.", response: null };
  }
  const response: GuestResponse = rawResponse;

  const rawParty = String(formData.get("partySize") ?? "").trim();
  let partySize: number | null = null;
  if (rawParty) {
    const parsed = Number(rawParty);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
      return {
        status: "error",
        message: "Number of people should be between 1 and 20.",
        response,
      };
    }
    partySize = parsed;
  }

  const note = String(formData.get("note") ?? "").trim() || null;

  try {
    const saved = await recordResponse(token, response, { partySize, note });
    if (!saved) {
      return {
        status: "error",
        message: "We could not find that invitation. Please use the link from your email.",
        response,
      };
    }
  } catch {
    return {
      status: "error",
      message: "Something went wrong saving your reply. Please try again.",
      response,
    };
  }

  return {
    status: "saved",
    message:
      response === "going"
        ? "Thank you, we have you down as coming."
        : "Thank you for letting us know.",
    response,
  };
}
