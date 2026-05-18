import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Search",
  description: "AI-powered voice search assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
