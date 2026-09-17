import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import OfflineSync from "@/components/OfflineSync";

export const metadata: Metadata = {
  // The real production domain. This was "https://app.fieldms.com" — a host we
  // do not own — so every relative image path resolved against it and social
  // crawlers fetched nothing. That is why links pasted into Instagram rendered
  // as a bare URL with no preview card.
  metadataBase: new URL("https://fieldms.com.au"),
  title: {
    default: "FieldMS — Job management software for Australian electricians",
    template: "%s · FieldMS",
  },
  description:
    "The all-in-one platform for Australian electricians. Quote, schedule, invoice, stay compliant and use AI to save time — built from real feedback from the trade. HVAC and refrigeration support is coming soon.",
  keywords: [
    "electrician software",
    "field service management",
    "electrical job management",
    "AS/NZS 3000 compliance",
    "tradie app Australia",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "FieldMS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/fieldms-icon.png",
    apple: "/fieldms-icon.png",
  },
  openGraph: {
    title: "FieldMS — Job management software for Australian electricians",
    description:
      "Quote, schedule, invoice and stay compliant in one AI-powered platform, built with Australian electricians.",
    type: "website",
    locale: "en_AU",
    siteName: "FieldMS",
    url: "https://fieldms.com.au",
    // 1200x630 is the size Instagram, Facebook and LinkedIn crop to. Without
    // this tag a shared link renders as a bare URL with no card at all.
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "FieldMS — every switchboard you've tested, and the date the next one's due.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FieldMS — Job management software for Australian electricians",
    description:
      "The all-in-one platform for Australian electricians. Built from real feedback from the trade.",
    // summary_large_image without an image is an empty card, so this is not
    // optional once the card type is set.
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <OfflineSync />
      </body>
    </html>
  );
}
