import type { Metadata } from "next";
import "./globals.css";
import { ClassificationBanner } from "@/components/ui/ClassificationBanner";

export const metadata: Metadata = {
  title: "GeoSim — Strategic Simulation Engine",
  description:
    "AI-powered strategic simulation engine modeling competitive dynamics between actors through interactive decision-making and branching scenario trees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ClassificationBanner />
        {children}
      </body>
    </html>
  );
}
