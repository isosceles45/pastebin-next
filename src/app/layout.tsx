import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pastebin",
  description: "Store text and share it with a link that can expire.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
