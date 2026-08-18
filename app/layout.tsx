import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "NovaForge Image Studios",
  description: "Secure multi-provider image and video generation gateway for NovaForge Studios.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#05070b", color: "#f5f7fb", fontFamily: "Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
