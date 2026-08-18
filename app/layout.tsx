import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "PossAbilities Invitations";
const description =
  "A PossAbilities-branded invitation creator with guest management, email preview, and animated RSVP experience.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const imageUrl = `${origin}/og.png`;

  return {
    title,
    description,
    metadataBase: new URL(origin),
    icons: {
      icon: "/brand/possabilities-stacked.png",
      shortcut: "/brand/possabilities-stacked.png",
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "PossAbilities Invitations animated envelope preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
