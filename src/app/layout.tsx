import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Elective Registration Portal | ECE – SVCE",
  description:
    "Elective registration portal for ECE students. AY 2026-2027. One registration per student. Real-time seat availability.",
  keywords: [
    "Elective registration",
    "Professional Elective registration",
    "ECE",
    "SVCE",
    "student portal",
    "AY 2026-2027",
  ],
  openGraph: {
    title: "Elective Registration Portal | ECE – SVCE",
    description:
      "Elective registration portal for ECE students, Sri Venkateswara College of Engineering.",
    type: "website",
    locale: "en_IN",
    siteName: "SVCE ECE Elective Portal",
  },
};

export const viewport: Viewport = {
  themeColor: "#070d1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark antialiased`}>
      <body className="bg-slate-950 text-slate-100 font-sans min-h-dvh flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#0f1729",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#f8fafc",
            },
          }}
        />
      </body>
    </html>
  );
}
