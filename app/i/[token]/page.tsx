import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatEventDate, formatEventTime } from "@/lib/event-format";
import { getInvitationByToken, markInvitationOpened } from "@/lib/invitations";

import { GuestInvitation } from "./guest-invitation";

type PageProps = {
  params: Promise<{ token: string }>;
};

/**
 * A guest's private invitation. The token in the URL is the only credential,
 * so this page is public by design -- recipients must not need an account.
 */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return { title: "Invitation not found" };
  }

  return {
    title: `${invitation.event.name} | PossAbilities Invitations`,
    description: invitation.event.message,
    // Guest invitations are private links. Keeping them out of search indexes
    // matters more than any sharing benefit.
    robots: { index: false, follow: false },
  };
}

export default async function GuestInvitationPage({ params }: PageProps) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  const { event, recipient } = invitation;
  await markInvitationOpened(recipient);

  return (
    <GuestInvitation
      accent={event.accent}
      cardHeader={event.cardHeader}
      cardTitle={event.cardTitle || event.name}
      endTime={event.endTime}
      eventDate={event.eventDate}
      eventDateLabel={formatEventDate(event.eventDate)}
      eventName={event.name}
      eventTimeLabel={formatEventTime(event.startTime, event.endTime)}
      host={event.host}
      initialNote={recipient.responseNote}
      initialPartySize={recipient.partySize}
      initialResponse={
        recipient.status === "going" || recipient.status === "declined"
          ? recipient.status
          : null
      }
      location={event.location}
      logoSize={event.logoSize}
      logoVariant={event.logoVariant}
      message={event.message}
      recipientName={recipient.name}
      startTime={event.startTime}
      token={recipient.token}
    />
  );
}
