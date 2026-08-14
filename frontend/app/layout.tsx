import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Don’t Press It — encrypted multiplayer game",
  description: "A multiplayer game of secret encrypted choices, built with Inco Lightning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
