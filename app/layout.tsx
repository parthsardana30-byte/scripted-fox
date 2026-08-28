import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Video — Data-backed YouTube planning",
  description:
    "Turn your next YouTube idea into a record-ready Video Plan and personalized script, supported by your channel, audience, and niche.",
  openGraph: {
    title: "Your next YouTube video, backed by real data.",
    description:
      "Decide what to make, understand why it fits, and build the resulting Video Plan and script.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
