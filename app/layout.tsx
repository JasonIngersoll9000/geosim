import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
