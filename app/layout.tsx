import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import OfflineSync from "@/components/OfflineSync";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  // The real production domain. This was "https://app.fieldms.com" — a host we
  // do not own — so every relative image path resolved against it and social
  // crawlers fetched nothing. That is why links pasted into Instagram rendered
  // as a bare URL with no preview card.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Electrician Job Management Software Australia | FieldMS",
    template: "%s · FieldMS",
  },
  // Search snippets are truncated around 155–160 characters, so the load-bearing
  // words go first: what it is, who it is for, where. "The all-in-one platform"
  // was spending the first twenty characters saying nothing searchable.
  description:
    "Job management software for Australian electricians. Quote on site, schedule your crew, complete test sheets and certificates, and invoice before you leave. Free during early access.",
  applicationName: "FieldMS",
  category: "business",
  keywords: [
    "electrician software",
    "electrician job management software",
    "electrical contractor software Australia",
    "field service management software",
    "electrical test sheet software",
    "AS/NZS 3000 compliance software",
    "tradie app Australia",
  ],
  // Explicit, because the default when Google sees no directive is a guess.
  // The long-snippet and large-preview permissions are what allow a full
  // description and the og image in a result rather than a clipped line.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  // Set GOOGLE_SITE_VERIFICATION in Vercel once Search Console gives you the
  // token; until then the tag is simply omitted rather than rendered empty.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
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
    url: SITE_URL,
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
    // en-AU, not en: it tells Google the page is written for an Australian
    // audience, which is the whole market this product serves.
    <html lang="en-AU" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <OfflineSync />
      </body>
    </html>
  );
}
