import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "rift — One command. Every service.",
  description:
    "Zero-config multi-service runner for full-stack projects. Detects frameworks, resolves ports, multiplexes logs. One terminal.",
  keywords: [
    "rift",
    "dev tool",
    "multi-service runner",
    "full-stack",
    "monorepo",
    "zero-config",
    "process manager",
    "concurrently",
  ],
  openGraph: {
    title: "rift — One command. Every service.",
    description:
      "Zero-config multi-service runner for full-stack projects. Detects frameworks, resolves ports, multiplexes logs.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <div className="viewport-glow" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
