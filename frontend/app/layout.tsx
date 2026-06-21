import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalFund — Trustless Crowdfunding",
  description: "Contribute ETH to a campaign. Goal met? Creator withdraws. Goal missed? Full refund — guaranteed by code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
