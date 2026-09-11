import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://scriptedfox.com");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "Scripted Fox",
  title: {
    default: "Scripted Fox — AI YouTube Script Writer & Idea Planner",
    template: "%s · Scripted Fox",
  },
  description:
    "Plan stronger YouTube videos with channel-matched topic ideas, trend signals, and AI-generated scripts built for your niche.",
  keywords: ["YouTube script writer", "AI YouTube script generator", "YouTube video ideas", "YouTube content planner", "Scripted Fox"],
  authors: [{ name: "Scripted Fox", url: siteUrl }],
  creator: "Scripted Fox",
  publisher: "Scripted Fox",
  robots: { index: true, follow: true },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  openGraph: {
    title: "Scripted Fox — AI YouTube Script Writer & Idea Planner",
    description:
      "Find channel-matched video ideas, spot trends, and create focused YouTube scripts with AI.",
    url: siteUrl,
    siteName: "Scripted Fox",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Scripted Fox — AI YouTube Script Writer & Idea Planner",
    description: "Find channel-matched video ideas, spot trends, and create focused YouTube scripts with AI.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-next-video-theme="light"
      suppressHydrationWarning className={cn("font-sans", geist.variable)}
    >
      <body>
        {children}
        <Script id="scripted-fox-theme" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("scripted-fox:theme");if(t==="dark"||t==="light")document.documentElement.dataset.nextVideoTheme=t}catch(e){}})()`}
        </Script>
      </body>
    </html>
  );
}
