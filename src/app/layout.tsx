import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerDesk — your job search, thoughtfully managed",
  description: "Build your CV, find real employer-board jobs, and review every application before handoff.",
};

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
