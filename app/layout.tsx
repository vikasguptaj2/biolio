import type { Metadata } from "next";
import { Playfair_Display, Manrope, DM_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Biolio — Your whole world. One little link.",
  description:
    "The unified bio website builder and Instagram DM automation platform for modern creators and brands.",
  metadataBase: new URL("https://biolio.site"),
  openGraph: {
    title: "Biolio — Editorial Bio Pages & Instagram DM Automation",
    description:
      "Craft bespoke bio websites with editorial elegance and run instant, keyword-triggered Instagram DM automations.",
    siteName: "Biolio",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${manrope.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-[#f4efe7] text-[#211b29]">
        {children}
      </body>
    </html>
  );
}
