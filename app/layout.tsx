import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import OfflineSync from "@/components/OfflineSync";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.fieldms.com"),
  title: {
    default: "FieldMS — Job management software for electricians & HVAC",
    template: "%s · FieldMS",
  },
  description:
    "The all-in-one platform for Australian electricians and HVAC technicians. Quote, schedule, invoice, stay compliant and use AI to save time — built from real feedback from the trade.",
  keywords: [
    "electrician software",
    "HVAC software",
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
    icon: "/fieldms icon.png",
    apple: "/fieldms icon.png",
  },
  openGraph: {
    title: "FieldMS — Job management software for electricians & HVAC",
    description:
      "Quote, schedule, invoice and stay compliant in one AI-powered platform, built with Australian electricians and HVAC technicians.",
    type: "website",
    locale: "en_AU",
    siteName: "FieldMS",
  },
  twitter: {
    card: "summary_large_image",
    title: "FieldMS — Job management software for electricians & HVAC",
    description:
      "The all-in-one platform for Australian electricians and HVAC technicians. Built from real feedback from the trade.",
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
