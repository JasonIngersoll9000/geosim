import type { Metadata } from "next";
import { Inter, Newsreader, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ClassificationBanner } from "@/components/ui/ClassificationBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "War Game — Strategic Simulation Engine",
  description:
    "AI-powered strategic war game simulation engine modeling competitive dynamics between actors through interactive decision-making and branching scenario trees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
    >
      <body className="antialiased">
        <ClassificationBanner />
        {children}
      </body>
    </html>
  );
}
